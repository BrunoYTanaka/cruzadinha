import { computeStats, type Stats, type StatsRow } from '@cruzadinha/shared'
import { useQuery } from '@tanstack/react-query'
import { useMemo } from 'react'
import { getStats } from '../../../../shared/services/api/stats/stats'
import { queryKeys } from '../../../../shared/services/api/query-keys/query-keys'
import { useSourceLibraries } from '../../../library'
import { useViewer, viewerKey } from '../../../session'

export type StatsResult =
  | { state: 'loading' }
  | { state: 'error'; retry: () => void }
  | { state: 'ready'; stats: Stats; guest: boolean }

// Conta: o servidor calcula. Visitante: a mesma regra (`computeStats`) sobre a biblioteca já
// mesclada com o progresso do navegador, então só entram os dias que a biblioteca lista (366 por
// fonte) e nada vai ao servidor além do pedido da lista.
export function useStats(): StatsResult {
  const viewer = useViewer()
  const isUser = viewer?.kind === 'user'
  const isGuest = viewer?.kind === 'guest'
  const account = useQuery({
    queryKey: queryKeys.stats(viewer ? viewerKey(viewer) : 'pending'),
    queryFn: getStats,
    enabled: isUser,
    retry: false,
  })
  const libraries = useSourceLibraries({ enabled: isGuest })
  const rows = useMemo<StatsRow[]>(
    () =>
      libraries.flatMap((library) =>
        library.items.map((item) => ({
          source: item.source,
          status: item.status === 'completed' ? 'completed' : 'in_progress',
          finishedMs: item.finishedMs,
          completedAt: item.completedAt,
          bestMs: item.bestMs,
        })),
      ),
    [libraries],
  )

  if (viewer === undefined) return { state: 'loading' }
  if (isUser) {
    if (account.isPending) return { state: 'loading' }
    if (account.isError || !account.data) {
      return { state: 'error', retry: () => void account.refetch() }
    }
    return { state: 'ready', stats: account.data, guest: false }
  }
  if (libraries.some((library) => library.query.isPending)) return { state: 'loading' }
  if (libraries.every((library) => library.query.isError)) {
    return {
      state: 'error',
      retry: () => libraries.forEach((library) => void library.query.refetch()),
    }
  }
  return { state: 'ready', stats: computeStats(rows, new Date()), guest: true }
}
