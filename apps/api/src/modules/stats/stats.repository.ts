import type { StatsRow } from '@cruzadinha/shared'
import { eq } from 'drizzle-orm'
import type { Executor } from '../../platform/db/client'
import { progress, puzzles } from '../../platform/db/schema'

// Nunca seleciona `progress.cells`, `puzzles.data` nem `puzzles.solution`.
export async function listStatsRows(db: Executor, userId: string): Promise<StatsRow[]> {
  const rows = await db
    .select({
      source: puzzles.source,
      status: progress.status,
      finishedMs: progress.finishedMs,
      completedAt: progress.completedAt,
      bestMs: progress.bestMs,
    })
    .from(progress)
    .innerJoin(puzzles, eq(puzzles.puzzleId, progress.puzzleId))
    .where(eq(progress.userId, userId))
  return rows.map((row) => ({ ...row, completedAt: row.completedAt?.toISOString() ?? null }))
}
