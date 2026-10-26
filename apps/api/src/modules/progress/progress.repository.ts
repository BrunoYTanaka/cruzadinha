import {
  progressCellsSchema,
  type Progress,
  type ProgressCells,
  type ProgressStatus,
} from '@cruzadinha/shared'
import { and, eq } from 'drizzle-orm'
import type { Executor } from '../../platform/db/client'
import { progress } from '../../platform/db/schema'

// Estado de uma partida como o serviço o enxerga: datas como Date, sem identificadores.
export type ProgressState = {
  cells: ProgressCells
  elapsedMs: number
  status: ProgressStatus
  savedAt: Date
  completedAt: Date | null
  finishedMs: number | null
  bestMs: number | null
  bestAt: Date | null
}

export type StoredProgress = ProgressState & { puzzleId: string; updatedAt: Date }

type ProgressRow = typeof progress.$inferSelect

// `jsonb` chega do banco como unknown em tempo de execução: relê pelo Zod. A mensagem de erro não
// inclui o conteúdo, que são as letras do jogador.
function toStored(row: ProgressRow): StoredProgress {
  const cells = progressCellsSchema.safeParse(row.cells)
  if (!cells.success) throw new Error('progresso guardado inválido')
  return {
    puzzleId: row.puzzleId,
    cells: cells.data,
    elapsedMs: row.elapsedMs,
    status: row.status,
    savedAt: row.savedAt,
    completedAt: row.completedAt,
    finishedMs: row.finishedMs,
    bestMs: row.bestMs,
    bestAt: row.bestAt,
    updatedAt: row.updatedAt,
  }
}

export function toProgress(stored: StoredProgress): Progress {
  return {
    puzzleId: stored.puzzleId,
    cells: stored.cells,
    elapsedMs: stored.elapsedMs,
    status: stored.status,
    savedAt: stored.savedAt.toISOString(),
    completedAt: stored.completedAt?.toISOString() ?? null,
    finishedMs: stored.finishedMs,
    bestMs: stored.bestMs,
    bestAt: stored.bestAt?.toISOString() ?? null,
    updatedAt: stored.updatedAt.toISOString(),
  }
}

const owned = (userId: string, puzzleId: string) =>
  and(eq(progress.userId, userId), eq(progress.puzzleId, puzzleId))

export async function findProgress(
  db: Executor,
  userId: string,
  puzzleId: string,
): Promise<StoredProgress | undefined> {
  const [row] = await db.select().from(progress).where(owned(userId, puzzleId))
  return row ? toStored(row) : undefined
}

// Cria a linha vazia se faltar. O `saved_at` na época garante que qualquer salvamento real passe.
export async function ensureRow(
  db: Executor,
  userId: string,
  puzzleId: string,
  emptyCells: ProgressCells,
): Promise<void> {
  await db
    .insert(progress)
    .values({
      userId,
      puzzleId,
      cells: emptyCells,
      elapsedMs: 0,
      status: 'in_progress',
      savedAt: new Date(0),
    })
    .onConflictDoNothing({ target: [progress.userId, progress.puzzleId] })
}

// Trava a linha até o fim da transação: salvamentos simultâneos do mesmo par se serializam.
export async function lockRow(
  db: Executor,
  userId: string,
  puzzleId: string,
): Promise<StoredProgress> {
  const [row] = await db.select().from(progress).where(owned(userId, puzzleId)).for('update')
  if (!row) throw new Error('progresso sumiu entre a criação e a trava')
  return toStored(row)
}

export async function updateProgress(
  db: Executor,
  userId: string,
  puzzleId: string,
  state: ProgressState,
): Promise<StoredProgress> {
  const [row] = await db
    .update(progress)
    .set({
      cells: state.cells,
      elapsedMs: state.elapsedMs,
      status: state.status,
      savedAt: state.savedAt,
      completedAt: state.completedAt,
      finishedMs: state.finishedMs,
      bestMs: state.bestMs,
      bestAt: state.bestAt,
    })
    .where(owned(userId, puzzleId))
    .returning()
  if (!row) throw new Error('progresso sumiu durante a atualização')
  return toStored(row)
}
