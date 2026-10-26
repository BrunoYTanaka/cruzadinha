import {
  cellsMatchGrid,
  type Progress,
  type ProgressCells,
  type SaveProgressRequest,
} from '@cruzadinha/shared'
import type { Database } from '../../platform/db/client'
import type { Clock } from '../../platform/lib/clock'
import { savedAtTooFar } from '../../platform/lib/saved-at'
import type { RateLimiter, RateWindow } from '../../platform/rate-limit'
import { findPuzzleGridById } from '../puzzles'
import {
  ensureRow,
  findProgress,
  lockRow,
  toProgress,
  updateProgress,
  type ProgressState,
} from './progress.repository'

export type { ProgressState } from './progress.repository'

export type SaveDecision =
  | { kind: 'apply'; next: ProgressState }
  | { kind: 'unchanged' }
  | { kind: 'progress-completed' }
  | { kind: 'invalid-saved-at' }

const sameCells = (a: ProgressCells, b: ProgressCells) => JSON.stringify(a) === JSON.stringify(b)

// Regras de salvamento sem banco: ordem (FR-010), conclusão protegida (FR-009), recorde (FR-007).
export function decideSave(
  current: ProgressState,
  request: SaveProgressRequest,
  now: Date,
): SaveDecision {
  if (savedAtTooFar(request.savedAt, now)) return { kind: 'invalid-saved-at' }
  const savedAt = new Date(request.savedAt)
  if (savedAt.getTime() < current.savedAt.getTime()) return { kind: 'unchanged' }

  if (current.status === 'completed') {
    const repeat = request.status === 'completed' && sameCells(request.cells, current.cells)
    return repeat ? { kind: 'unchanged' } : { kind: 'progress-completed' }
  }

  if (request.status === 'in_progress') {
    return {
      kind: 'apply',
      next: {
        ...current,
        cells: request.cells,
        elapsedMs: request.elapsedMs,
        status: 'in_progress',
        savedAt,
      },
    }
  }

  const beatsRecord = current.bestMs === null || request.elapsedMs < current.bestMs
  return {
    kind: 'apply',
    next: {
      cells: request.cells,
      elapsedMs: request.elapsedMs,
      status: 'completed',
      savedAt,
      completedAt: now,
      finishedMs: request.elapsedMs,
      bestMs: beatsRecord ? request.elapsedMs : current.bestMs,
      bestAt: beatsRecord ? now : current.bestAt,
    },
  }
}

// O reinício zera a partida atual e mantém o recorde. O `savedAt` avança para que salvamentos
// atrasados, anteriores ao reinício, sejam ignorados.
export function decideReset(
  current: ProgressState,
  emptyCells: ProgressCells,
  now: Date,
): ProgressState {
  return {
    cells: emptyCells,
    elapsedMs: 0,
    status: 'in_progress',
    savedAt: new Date(Math.max(current.savedAt.getTime(), now.getTime())),
    completedAt: null,
    finishedMs: null,
    bestMs: current.bestMs,
    bestAt: current.bestAt,
  }
}

export type GetProgressResult =
  { ok: true; progress: Progress | null } | { ok: false; reason: 'puzzle-unavailable' }

export type SaveProgressResult =
  | { ok: true; progress: Progress }
  | { ok: false; reason: 'puzzle-unavailable' | 'progress-completed' }
  | { ok: false; reason: 'too-many-attempts'; retryAfterSeconds: number }
  | { ok: false; reason: 'invalid-input'; fields: string[] }

export type ResetProgressResult =
  | { ok: true; progress: Progress }
  | { ok: false; reason: 'puzzle-unavailable' }
  | { ok: false; reason: 'too-many-attempts'; retryAfterSeconds: number }

export type ProgressService = {
  get(userId: string, puzzleId: string): Promise<GetProgressResult>
  save(userId: string, puzzleId: string, request: SaveProgressRequest): Promise<SaveProgressResult>
  reset(userId: string, puzzleId: string): Promise<ResetProgressResult>
}

export type ProgressDeps = {
  db: Database
  clock: Clock
  rateLimiter: RateLimiter
  limits: { progressSave: RateWindow }
}

const emptyCellsFor = (height: number, width: number): ProgressCells =>
  Array.from({ length: height }, () => Array.from({ length: width }, () => null))

export function createProgressService(deps: ProgressDeps): ProgressService {
  const { db, clock, rateLimiter, limits } = deps

  // Cada gravação ou reinício conta para o usuário, antes de tocar o banco.
  async function admit(userId: string, now: Date) {
    const key = { action: 'PROGRESS_SAVE', keyType: 'USER', keyValue: userId } as const
    const reservation = await rateLimiter.reserve([{ key, window: limits.progressSave }], now)
    return reservation.allowed
      ? null
      : ({
          ok: false,
          reason: 'too-many-attempts',
          retryAfterSeconds: reservation.retryAfterSeconds,
        } as const)
  }

  return {
    async get(userId, puzzleId) {
      if (!(await findPuzzleGridById(db, puzzleId))) {
        return { ok: false, reason: 'puzzle-unavailable' }
      }
      const found = await findProgress(db, userId, puzzleId)
      return { ok: true, progress: found ? toProgress(found) : null }
    },

    async save(userId, puzzleId, request) {
      const refused = await admit(userId, clock())
      if (refused) return refused
      const grid = await findPuzzleGridById(db, puzzleId)
      if (!grid) return { ok: false, reason: 'puzzle-unavailable' }
      // Só nomes de campos: o conteúdo das letras nunca vai a mensagem nem a log.
      if (!cellsMatchGrid(grid, request.cells).success) {
        return { ok: false, reason: 'invalid-input', fields: ['cells'] }
      }
      const now = clock()
      if (savedAtTooFar(request.savedAt, now)) {
        return { ok: false, reason: 'invalid-input', fields: ['savedAt'] }
      }

      return db.transaction(async (tx): Promise<SaveProgressResult> => {
        await ensureRow(tx, userId, puzzleId, emptyCellsFor(grid.height, grid.width))
        const current = await lockRow(tx, userId, puzzleId)
        const decision = decideSave(current, request, now)
        if (decision.kind === 'progress-completed') {
          return { ok: false, reason: 'progress-completed' }
        }
        if (decision.kind === 'invalid-saved-at') {
          return { ok: false, reason: 'invalid-input', fields: ['savedAt'] }
        }
        if (decision.kind === 'unchanged') return { ok: true, progress: toProgress(current) }
        const saved = await updateProgress(tx, userId, puzzleId, decision.next)
        return { ok: true, progress: toProgress(saved) }
      })
    },

    async reset(userId, puzzleId) {
      const refused = await admit(userId, clock())
      if (refused) return refused
      const grid = await findPuzzleGridById(db, puzzleId)
      if (!grid) return { ok: false, reason: 'puzzle-unavailable' }
      const empty = emptyCellsFor(grid.height, grid.width)
      const now = clock()

      return db.transaction(async (tx): Promise<ResetProgressResult> => {
        await ensureRow(tx, userId, puzzleId, empty)
        const current = await lockRow(tx, userId, puzzleId)
        const saved = await updateProgress(tx, userId, puzzleId, decideReset(current, empty, now))
        return { ok: true, progress: toProgress(saved) }
      })
    },
  }
}
