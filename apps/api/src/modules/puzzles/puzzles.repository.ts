import {
  gridSchema,
  puzzleSchema,
  solutionSchema,
  type Level,
  type Puzzle,
  type PuzzleSourceId,
  type Solution,
} from '@cruzadinha/shared'
import { and, eq, inArray, sql } from 'drizzle-orm'
import type { Executor } from '../../platform/db/client'
import { puzzles } from '../../platform/db/schema'

export type StoredPuzzle = { puzzleId: string; puzzle: Puzzle; solution: Solution }

export type PuzzleKey = { source: PuzzleSourceId; level: Level; date: string }

type PuzzleRow = typeof puzzles.$inferSelect

// `jsonb` chega do banco como unknown em tempo de execução: relê pelo Zod antes de entregar.
// A mensagem não inclui o conteúdo, que pode ser a solução.
function toStored(row: PuzzleRow): StoredPuzzle {
  const puzzle = puzzleSchema.safeParse(row.data)
  const solution = solutionSchema.safeParse(row.solution)
  if (!puzzle.success || !solution.success) throw new Error('puzzle guardado inválido')
  return { puzzleId: row.puzzleId, puzzle: puzzle.data, solution: solution.data }
}

export async function findPuzzle(db: Executor, key: PuzzleKey): Promise<StoredPuzzle | undefined> {
  const [row] = await db
    .select()
    .from(puzzles)
    .where(
      and(eq(puzzles.source, key.source), eq(puzzles.level, key.level), eq(puzzles.date, key.date)),
    )
  return row ? toStored(row) : undefined
}

export async function findPuzzleById(
  db: Executor,
  puzzleId: string,
): Promise<StoredPuzzle | undefined> {
  const [row] = await db.select().from(puzzles).where(eq(puzzles.puzzleId, puzzleId))
  return row ? toStored(row) : undefined
}

// Só a grade, sem a solução nem o resto do puzzle: o progresso precisa apenas do tamanho e das
// células. `jsonb` chega como unknown e é relido pelo Zod, como em `toStored`.
export async function findPuzzleGridById(
  db: Executor,
  puzzleId: string,
): Promise<Puzzle['grid'] | undefined> {
  const [row] = await db
    .select({ grid: sql<unknown>`${puzzles.data}->'grid'` })
    .from(puzzles)
    .where(eq(puzzles.puzzleId, puzzleId))
  if (!row) return undefined
  const grid = gridSchema.safeParse(row.grid)
  if (!grid.success) throw new Error('puzzle guardado inválido')
  return grid.data
}

// Nunca reescreve um puzzle guardado: em conflito devolve o id existente com inserted: false.
export async function insertPuzzleIfAbsent(
  db: Executor,
  values: { puzzle: Puzzle; solution: Solution },
): Promise<{ puzzleId: string; inserted: boolean }> {
  const { puzzle, solution } = values
  const [created] = await db
    .insert(puzzles)
    .values({
      source: puzzle.source,
      level: puzzle.level,
      date: puzzle.date,
      data: puzzle,
      solution,
    })
    .onConflictDoNothing({ target: [puzzles.source, puzzles.level, puzzles.date] })
    .returning({ puzzleId: puzzles.puzzleId })
  if (created) return { puzzleId: created.puzzleId, inserted: true }

  const [existing] = await db
    .select({ puzzleId: puzzles.puzzleId })
    .from(puzzles)
    .where(
      and(
        eq(puzzles.source, puzzle.source),
        eq(puzzles.level, puzzle.level),
        eq(puzzles.date, puzzle.date),
      ),
    )
  if (!existing) throw new Error('puzzle sumiu entre o conflito e a leitura')
  return { puzzleId: existing.puzzleId, inserted: false }
}

export async function existingDates(
  db: Executor,
  query: { source: PuzzleSourceId; level: Level; dates: string[] },
): Promise<Set<string>> {
  if (query.dates.length === 0) return new Set()
  const rows = await db
    .select({ date: puzzles.date })
    .from(puzzles)
    .where(
      and(
        eq(puzzles.source, query.source),
        eq(puzzles.level, query.level),
        inArray(puzzles.date, query.dates),
      ),
    )
  return new Set(rows.map((row) => row.date))
}
