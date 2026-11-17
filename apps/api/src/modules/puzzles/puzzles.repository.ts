import {
  gridSchema,
  puzzleSchema,
  solutionSchema,
  type Level,
  type Puzzle,
  type PuzzleSourceId,
  type Solution,
  wordCells,
} from '@cruzadinha/shared'
import { and, eq, gte, inArray, lt, sql } from 'drizzle-orm'
import type { Executor } from '../../platform/db/client'
import { addDaysToIsoDate } from '../../platform/lib/dates'
import { duels, progress, puzzles } from '../../platform/db/schema'

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

// Resposta de cada palavra, lida da solução pelas casas da palavra (feature 064).
export function answersOf({ puzzle, solution }: { puzzle: Puzzle; solution: Solution }): string[] {
  return puzzle.words.map((word) =>
    wordCells(word)
      .map(({ row, col }) => solution.cells[row]?.[col] ?? '')
      .join(''),
  )
}

// Feature 064 (FR-022): respostas das cruzadas da fonte nos `days` dias antes de `today`.
export async function recentAnswers(
  db: Executor,
  options: { source: PuzzleSourceId; today: string; days: number },
): Promise<string[]> {
  const rows = await db
    .select()
    .from(puzzles)
    .where(
      and(
        eq(puzzles.source, options.source),
        gte(puzzles.date, addDaysToIsoDate(options.today, -options.days)),
        lt(puzzles.date, options.today),
      ),
    )
  return rows.flatMap((row) => answersOf(toStored(row)))
}

export type TodayPuzzle = StoredPuzzle & { blockedBy: 'progress' | 'duel' | null }

// Feature 064 (FR-024): a cruzada do dia de uma fonte e se alguma conta ou x1 já a usa.
export async function findToday(
  db: Executor,
  options: { source: PuzzleSourceId; date: string },
): Promise<TodayPuzzle | undefined> {
  const stored = await findPuzzle(db, { ...options, level: 'daily' })
  if (!stored) return undefined
  const [played] = await db
    .select({ id: progress.puzzleId })
    .from(progress)
    .where(eq(progress.puzzleId, stored.puzzleId))
    .limit(1)
  const [dueled] = played
    ? []
    : await db
        .select({ id: duels.puzzleId })
        .from(duels)
        .where(eq(duels.puzzleId, stored.puzzleId))
        .limit(1)
  return { ...stored, blockedBy: played ? 'progress' : dueled ? 'duel' : null }
}

// Feature 064 (FR-025): apaga a cruzada do dia de uma fonte. `progress` e `duels` têm FK
// `ON DELETE RESTRICT`, então uma cruzada em uso nunca sai, mesmo numa corrida.
export async function deleteTodayIfUnused(
  db: Executor,
  options: { source: PuzzleSourceId; date: string; puzzleId: string },
): Promise<'deleted' | 'not-found' | 'in-use'> {
  try {
    const rows = await db
      .delete(puzzles)
      .where(
        and(
          eq(puzzles.puzzleId, options.puzzleId),
          eq(puzzles.source, options.source),
          eq(puzzles.date, options.date),
        ),
      )
      .returning({ id: puzzles.puzzleId })
    return rows.length > 0 ? 'deleted' : 'not-found'
  } catch (error) {
    if (isForeignKeyViolation(error)) return 'in-use'
    throw error
  }
}

// 23503: violação de chave estrangeira (o erro do driver pode vir embrulhado pelo Drizzle).
function isForeignKeyViolation(error: unknown): boolean {
  for (let current: unknown = error; current;) {
    if (typeof current === 'object' && 'code' in current && current.code === '23503') return true
    current = typeof current === 'object' && 'cause' in current ? current.cause : undefined
  }
  return false
}
