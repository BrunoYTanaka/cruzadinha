import { computeStats, type Stats } from '@cruzadinha/shared'
import type { Database } from '../../platform/db/client'
import type { Clock } from '../../platform/lib/clock'
import { listStatsRows } from './stats.repository'

export type StatsService = ReturnType<typeof createStatsService>

// Só lê o progresso da própria conta; a regra de cálculo é a mesma que o site usa para o visitante.
export function createStatsService(deps: { db: Database; clock: Clock }) {
  return {
    async get(userId: string): Promise<Stats> {
      return computeStats(await listStatsRows(deps.db, userId), deps.clock())
    },
  }
}
