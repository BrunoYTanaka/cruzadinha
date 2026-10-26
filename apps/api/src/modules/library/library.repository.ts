import type { Level, ProgressStatus, PuzzleSourceId } from '@cruzadinha/shared'
import { and, asc, desc, eq, sql } from 'drizzle-orm'
import type { Executor } from '../../platform/db/client'
import { progress, puzzles } from '../../platform/db/schema'

// Uma linha da biblioteca: metadados do puzzle e, se o usuário já jogou, o resumo do progresso.
// As colunas de progresso vêm nulas quando não há linha; `hasLetters` evita trazer as letras.
export type LibraryRow = {
  puzzleId: string
  source: PuzzleSourceId
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

export type PuzzleRow = Pick<LibraryRow, 'puzzleId' | 'source' | 'date' | 'level'>

// Biblioteca de visitante (feature 013): só os metadados dos puzzles, na mesma ordem da biblioteca
// de uma conta, sem `JOIN` com `progress` e sem `data`/`solution`.
export async function listPuzzleRows(
  db: Executor,
  source: PuzzleSourceId,
  limit: number,
): Promise<PuzzleRow[]> {
  return db
    .select({
      puzzleId: puzzles.puzzleId,
      source: puzzles.source,
      date: puzzles.date,
      level: puzzles.level,
    })
    .from(puzzles)
    .where(eq(puzzles.source, source))
    .orderBy(desc(puzzles.date), asc(puzzles.level), asc(puzzles.puzzleId))
    .limit(limit)
}

// Nunca seleciona `puzzles.data`, `puzzles.solution` nem `progress.cells`. O filtro do usuário fica
// no `ON` (e não no `WHERE`) para que os puzzles sem progresso continuem na lista.
export async function listLibraryRows(
  db: Executor,
  userId: string,
  source: PuzzleSourceId,
  limit: number,
): Promise<LibraryRow[]> {
  return db
    .select({
      puzzleId: puzzles.puzzleId,
      source: puzzles.source,
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
    .where(eq(puzzles.source, source))
    .orderBy(desc(puzzles.date), asc(puzzles.level), asc(puzzles.puzzleId))
    .limit(limit)
}
