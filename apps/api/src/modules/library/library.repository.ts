import type { Level, ProgressStatus } from '@cruzadinha/shared'
import { and, asc, desc, eq, sql } from 'drizzle-orm'
import type { Executor } from '../../db/client'
import { progress, puzzles } from '../../db/schema'

// Uma linha da biblioteca: metadados do puzzle e, se o usuário já jogou, o resumo do progresso.
// As colunas de progresso vêm nulas quando não há linha; `hasLetters` evita trazer as letras.
export type LibraryRow = {
  puzzleId: string
  date: string
  level: Level
  status: ProgressStatus | null
  elapsedMs: number | null
  finishedMs: number | null
  completedAt: Date | null
  bestMs: number | null
  bestAt: Date | null
  hasLetters: boolean | null
}

// Nunca seleciona `puzzles.data`, `puzzles.solution` nem `progress.cells`. O filtro do usuário fica
// no `ON` (e não no `WHERE`) para que os puzzles sem progresso continuem na lista.
export async function listLibraryRows(
  db: Executor,
  userId: string,
  limit: number,
): Promise<LibraryRow[]> {
  return db
    .select({
      puzzleId: puzzles.puzzleId,
      date: puzzles.date,
      level: puzzles.level,
      status: progress.status,
      elapsedMs: progress.elapsedMs,
      finishedMs: progress.finishedMs,
      completedAt: progress.completedAt,
      bestMs: progress.bestMs,
      bestAt: progress.bestAt,
      hasLetters: sql<
        boolean | null
      >`jsonb_path_exists(${progress.cells}, '$[*][*] ? (@ != null)')`,
    })
    .from(puzzles)
    .leftJoin(progress, and(eq(progress.puzzleId, puzzles.puzzleId), eq(progress.userId, userId)))
    .orderBy(desc(puzzles.date), asc(puzzles.level), asc(puzzles.puzzleId))
    .limit(limit)
}
