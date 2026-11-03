import { puzzleSourceIdSchema, type PuzzleSourceId } from '@cruzadinha/shared'
import type { QueryClient } from '@tanstack/react-query'
import { queryKeys } from '../query-keys/query-keys'
import { fetchSources } from '../sources/sources'

// A alteração da administração chega ao público em até 1 minuto (feature 060, FR-015).
export const VISIBLE_SOURCES_STALE_MS = 30_000

// Erro ou 404 (API anterior): todas as fontes na ordem padrão, nunca um erro para o site.
export const ALL_SOURCES: readonly PuzzleSourceId[] = puzzleSourceIdSchema.options

// `fetchQuery` respeita o `staleTime`: lista fresca vem do cache, vencida é pedida de novo.
// Mesma chave, mesmo `staleTime` e mesmo fallback para o hook e para os loaders (sem hook).
export const visibleSourcesQuery = {
  queryKey: queryKeys.sources,
  queryFn: async (): Promise<readonly PuzzleSourceId[]> => (await fetchSources()).sources,
  staleTime: VISIBLE_SOURCES_STALE_MS,
  refetchOnWindowFocus: true,
  retry: false,
  // Uma consulta com erro não refaz a cada componente que monta (sairia em laço com o portão de
  // carregamento); o fallback vale até a próxima janela de 30 s.
  retryOnMount: false,
} as const

export async function fetchVisibleSources(
  queryClient: QueryClient,
): Promise<readonly PuzzleSourceId[]> {
  try {
    return await queryClient.fetchQuery(visibleSourcesQuery)
  } catch {
    return ALL_SOURCES
  }
}
