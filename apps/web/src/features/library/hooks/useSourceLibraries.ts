import {
  puzzleSourceIdSchema,
  puzzleSourceNames,
  type LibraryItem,
  type LibraryResponse,
  type PuzzleSourceId,
} from '@cruzadinha/shared'
import { useEffect, useRef } from 'react'
import { useQueries, useQueryClient, type UseQueryResult } from '@tanstack/react-query'
import { getLibrary } from '../../../shared/services/api/library/library'
import { queryKeys } from '../../../shared/services/api/query-keys/query-keys'
import { useOnline } from '../../../shared/hooks/useOnline/useOnline'
import { useViewer, viewerKey, type Viewer } from '../../session'
import { mergeGuestLibrary, guestStore } from '../../guest'
import { listStoredPuzzles, readKnownProgress } from '../../offline'

export type SourceLibrary = {
  source: PuzzleSourceId
  name: string
  query: UseQueryResult<LibraryResponse>
  // Só os itens desta fonte: a API anterior à feature 014 ignora a fonte e lista só O Globo.
  items: LibraryItem[]
}

// Visitante: os dias vêm do servidor e a situação de cada um, do navegador (feature 013, FR-007).
export async function libraryFor(viewer: Viewer, source: PuzzleSourceId) {
  const response =
    navigator.onLine === false ? await storedLibrary(viewer, source) : await getLibrary(source)
  if (viewer.kind === 'user') return response
  return { items: mergeGuestLibrary(response.items, await guestStore.getAll()) }
}

// Sem rede, só os dias guardados neste aparelho (feature 041, FR-016); a situação de cada um vem do
// último progresso conhecido (conta) ou do navegador (visitante, em libraryFor).
async function storedLibrary(viewer: Viewer, source: PuzzleSourceId): Promise<LibraryResponse> {
  const stored = (await listStoredPuzzles()).filter((puzzle) => puzzle.source === source)
  const items = await Promise.all(
    stored.map(async ({ puzzleId, date }): Promise<LibraryItem> => {
      const progress =
        viewer.kind === 'user' ? await readKnownProgress(viewer.user.id, puzzleId) : null
      return {
        puzzleId,
        source,
        date,
        level: 'daily',
        status: progress?.status ?? 'not_started',
        elapsedMs: progress?.elapsedMs ?? null,
        finishedMs: progress?.finishedMs ?? null,
        completedAt: progress?.completedAt ?? null,
        bestMs: progress?.bestMs ?? null,
        bestAt: progress?.bestAt ?? null,
      }
    }),
  )
  return { items }
}

const SOURCES = puzzleSourceIdSchema.options

// Fora do componente, para ser a mesma função a cada render: o TanStack Query só a roda de novo
// quando algum resultado muda, então `items` fica estável para os `useMemo` de quem usa.
function combine(results: UseQueryResult<LibraryResponse>[]): SourceLibrary[] {
  return SOURCES.flatMap((source, index) => {
    const query = results[index]
    if (!query) return []
    return [
      {
        source,
        name: puzzleSourceNames[source],
        query,
        items: (query.data?.items ?? []).filter((item) => item.source === source),
      },
    ]
  })
}

// Uma consulta por fonte, com as chaves de sempre: calendário, cartões de hoje e atalho de conclusão
// dividem o cache, e cada fonte carrega e falha sozinha (feature 015, FR-014).
export function useSourceLibraries({
  enabled = true,
}: { enabled?: boolean } = {}): SourceLibrary[] {
  const viewer = useViewer()
  const online = useOnline()
  const queryClient = useQueryClient()
  // A lista muda entre os dias guardados (sem rede) e a da API: refaz ao mudar a conexão.
  const first = useRef(true)
  useEffect(() => {
    if (first.current) first.current = false
    else void queryClient.invalidateQueries({ queryKey: queryKeys.libraryAll })
  }, [online, queryClient])
  return useQueries({
    queries: SOURCES.map((source) => ({
      queryKey: queryKeys.library(viewer ? viewerKey(viewer) : 'pending', source),
      queryFn: () => (viewer ? libraryFor(viewer, source) : getLibrary(source)),
      enabled: enabled && viewer !== undefined,
      // Com a API anterior, a biblioteca de visitante responde 401: um erro só, sem novas tentativas
      // (R19, feature 013).
      retry: false,
    })),
    combine,
  })
}

// Toda fonte da lista tem uma entrada; a escolha guardada já passa pelo schema (source-choice).
export function libraryOf(
  libraries: readonly SourceLibrary[],
  source: PuzzleSourceId,
): SourceLibrary {
  const entry = libraries.find((library) => library.source === source)
  if (!entry) throw new Error(`fonte sem biblioteca: ${source}`)
  return entry
}
