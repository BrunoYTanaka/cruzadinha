import { useQuery } from '@tanstack/react-query'
import { getProgress } from '../../../shared/services/api/progress'
import { getPuzzleById } from '../../../shared/services/api/puzzles'
import { queryKeys } from '../../../shared/services/api/query-keys'
import { createGuestSaveQueue, guestStore } from '../../guest'
import { useViewer, type Viewer } from '../../session'
import type { GameOwner } from './useGame'

// Carrega a cruzada e o progresso em paralelo: o da conta vem do servidor, o do visitante do
// navegador (feature 013). Depois de carregado, nenhum erro tira o tabuleiro da tela (FR-032):
// falhas viram avisos que não bloqueiam.
export function useGameData(puzzleId: string) {
  const viewer = useViewer()
  const puzzleQuery = useQuery({
    queryKey: queryKeys.puzzle(puzzleId),
    queryFn: () => getPuzzleById(puzzleId),
    retry: false,
    refetchOnWindowFocus: false,
  })
  // O progresso é sempre buscado de novo ao abrir, e nunca recarregado por baixo do jogo.
  const progressQuery = useQuery({
    queryKey: queryKeys.progress(puzzleId),
    queryFn: () => getProgress(puzzleId),
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
