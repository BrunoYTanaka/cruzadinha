import {
  puzzleSourceIdSchema,
  puzzleSourceNames,
  type LibraryItem,
  type LibraryResponse,
  type PuzzleSourceId,
} from '@cruzadinha/shared'
import { useQueries, type UseQueryResult } from '@tanstack/react-query'
import { getLibrary } from '../../../shared/services/api/library'
import { queryKeys } from '../../../shared/services/api/query-keys'
import { useViewer, viewerKey, type Viewer } from '../../session'
import { mergeGuestLibrary } from '../../guest'
import { guestStore } from '../../guest'

export type SourceLibrary = {
  source: PuzzleSourceId
  name: string
  query: UseQueryResult<LibraryResponse>
  // Só os itens desta fonte: a API anterior à feature 014 ignora a fonte e lista só O Globo.
  items: LibraryItem[]
}

// Visitante: os dias vêm do servidor e a situação de cada um, do navegador (feature 013, FR-007).
export async function libraryFor(viewer: Viewer, source: PuzzleSourceId) {
  const response = await getLibrary(source)
  if (viewer.kind === 'user') return response
  return { items: mergeGuestLibrary(response.items, await guestStore.getAll()) }
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
