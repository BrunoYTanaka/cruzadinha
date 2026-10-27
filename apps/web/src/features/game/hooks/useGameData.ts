import type { ProgressEnvelope, PuzzleResponse } from '@cruzadinha/shared'
import { useQuery } from '@tanstack/react-query'
import { ApiRequestError } from '../../../shared/services/api/client/client'
import { getProgress } from '../../../shared/services/api/progress/progress'
import { getPuzzleById } from '../../../shared/services/api/puzzles/puzzles'
import { queryKeys } from '../../../shared/services/api/query-keys/query-keys'
import { createGuestSaveQueue, guestStore } from '../../guest'
import { readKnownProgress, readPuzzle, savePuzzle, writeKnownProgress } from '../../offline'
import { useViewer, type Viewer } from '../../session'
import type { GameOwner } from './useGame'

// Sem cópia guardada e sem rede: a cruzada só abre com conexão (feature 041).
export class NeedsConnectionError extends Error {
  constructor() {
    super('a cruzada só abre com conexão')
    this.name = 'NeedsConnectionError'
  }
}

// A cópia guardada vale mesmo com rede (FR-019); só sem ela o site pergunta à API e guarda o que veio.
async function loadPuzzle(puzzleId: string): Promise<PuzzleResponse> {
  const stored = await readPuzzle(puzzleId)
  if (stored) return stored
  if (navigator.onLine === false) throw new NeedsConnectionError()
  const response = await getPuzzleById(puzzleId)
  void savePuzzle(response)
  return response
}

// O progresso da conta vem do servidor; sem rede (ou sem resposta), o último progresso conhecido
// neste aparelho, e o jogo põe a fila local por cima (FR-018).
async function loadProgress(userId: string, puzzleId: string): Promise<ProgressEnvelope> {
  if (navigator.onLine === false) return { progress: await readKnownProgress(userId, puzzleId) }
  try {
    const envelope = await getProgress(puzzleId)
    if (envelope.progress) void writeKnownProgress(userId, envelope.progress)
    return envelope
  } catch (error) {
    if (!(error instanceof ApiRequestError && error.isOffline)) throw error
    return { progress: await readKnownProgress(userId, puzzleId) }
  }
}

// Carrega a cruzada e o progresso em paralelo: o da conta vem do servidor, o do visitante do
// navegador (feature 013). Depois de carregado, nenhum erro tira o tabuleiro da tela (FR-032):
// falhas viram avisos que não bloqueiam.
export function useGameData(puzzleId: string) {
  const viewer = useViewer()
  const puzzleQuery = useQuery({
    queryKey: queryKeys.puzzle(puzzleId),
    queryFn: () => loadPuzzle(puzzleId),
    retry: false,
    refetchOnWindowFocus: false,
  })
  // O progresso é sempre buscado de novo ao abrir, e nunca recarregado por baixo do jogo.
  const progressQuery = useQuery({
    queryKey: queryKeys.progress(puzzleId),
    queryFn: () => loadProgress(viewer?.kind === 'user' ? viewer.user.id : '', puzzleId),
    enabled: viewer?.kind === 'user',
    retry: false,
    gcTime: 0,
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
  })
  const grid = puzzleQuery.data?.puzzle.grid
  const guestQuery = useQuery({
    queryKey: ['guest-progress', puzzleId],
    queryFn: () => (grid ? guestStore.getForPuzzle(puzzleId, grid) : null),
    enabled: viewer?.kind === 'guest' && grid !== undefined,
    retry: false,
    gcTime: 0,
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
  })

  const failure = puzzleQuery.error ?? progressQuery.error
  // Ao trocar de visitante para conta (ou o inverso) a consulta volta a buscar: o jogo só monta
  // com o progresso novo, nunca com o que ficou em cache da troca anterior.
  const fetching = viewer?.kind === 'user' ? progressQuery.isFetching : guestQuery.isFetching
  const owner = fetching ? null : ownerOf(viewer, progressQuery.data?.progress, guestQuery.data)
  const retry = () => {
    void puzzleQuery.refetch()
    if (viewer?.kind === 'user') void progressQuery.refetch()
  }
  return { viewer, response: puzzleQuery.data, owner, failure, retry }
}

function ownerOf(
  viewer: Viewer | undefined,
  progress: GameOwnerProgress | undefined,
  record: GuestRecord | undefined,
): GameOwner | null {
  if (!viewer) return null
  if (viewer.kind === 'user') {
    return progress === undefined ? null : { kind: 'user', user: viewer.user, progress }
  }
  return record === undefined
    ? null
    : { kind: 'guest', record, store: guestStore, createQueue: createGuestSaveQueue }
}

type GameOwnerProgress = Extract<GameOwner, { kind: 'user' }>['progress']
type GuestRecord = Extract<GameOwner, { kind: 'guest' }>['record']
