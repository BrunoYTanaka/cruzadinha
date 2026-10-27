import { IDBFactory } from 'fake-indexeddb'
import { openDB } from 'idb'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { guestStore } from '../../../guest'
import { makeProgress, makePuzzleResponse, PUZZLE_ID, TINY } from '../../../../test/fixtures'
import { saveDraft } from '../draft/draft'
import { applyOutboxEvent } from '../outbox/outbox'
import {
  clearKnownProgress,
  listStoredPuzzles,
  OFFLINE_DB_NAME,
  OFFLINE_PUZZLE_LIMIT,
  readKnownProgress,
  readPuzzle,
  savePuzzle,
  writeKnownProgress,
} from './offline-store'

const USER = '3f1c9a52-1a2b-4c3d-8e4f-0123456789ab'
const OTHER = '9a8b7c6d-5e4f-4a3b-9c2d-1e0f9a8b7c6d'
const id = (n: number) => `00000000-0000-4000-8000-${String(n).padStart(12, '0')}`

function response(n: number) {
  return makePuzzleResponse(TINY, { puzzleId: id(n) })
}

beforeEach(() => localStorage.clear())

describe('puzzles', () => {
  it('stores and reads a puzzle, listing it', async () => {
    const r = makePuzzleResponse(TINY)
    expect(await savePuzzle(r)).toBe(true)
    expect(await readPuzzle(r.puzzleId)).toEqual(r)
    expect(await listStoredPuzzles()).toEqual([
      expect.objectContaining({
        puzzleId: PUZZLE_ID,
        source: r.puzzle.source,
        date: r.puzzle.date,
      }),
    ])
    expect(await readPuzzle(id(999))).toBeNull()
  })

  it('updates openedAt on read', async () => {
    await savePuzzle(response(1), 100)
    await readPuzzle(id(1), 500)
    const db = await openDB(OFFLINE_DB_NAME)
    expect((await db.get('puzzles', id(1))).openedAt).toBe(500)
    db.close()
  })

  it('deletes an invalid record and treats it as absent', async () => {
    await savePuzzle(response(1))
    const db = await openDB(OFFLINE_DB_NAME)
    await db.put('puzzles', {
      puzzleId: id(2),
      response: { nope: true },
      source: 'oglobo',
      date: '2026-10-14',
      openedAt: 1,
    })
    db.close()
    expect(await readPuzzle(id(2))).toBeNull()
    expect((await listStoredPuzzles()).map((p) => p.puzzleId)).toEqual([id(1)])
  })

  it('over the limit removes the least recently opened, sparing protected ones', async () => {
    // 1: com envio pendente; 2: visitante em andamento; 3: progresso conhecido em andamento;
    // 5: com rascunho
    for (let n = 1; n <= OFFLINE_PUZZLE_LIMIT; n += 1) await savePuzzle(response(n), n)
    applyOutboxEvent(OTHER, id(1), {
      type: 'reset',
      at: new Date(0).toISOString(),
    })
    await guestStore.save({
      puzzleId: id(2),
      date: '2026-10-14',
      cells: [[null]],
      elapsedMs: 1,
      status: 'in_progress',
      savedAt: new Date().toISOString(),
      help: null,
    })
    await writeKnownProgress(USER, makeProgress({ puzzleId: id(3), status: 'in_progress' }))
    saveDraft('guest', id(5), [['A']])
    await savePuzzle(response(1000), 1000)
    const kept = (await listStoredPuzzles()).map((p) => p.puzzleId)
    expect(kept).toHaveLength(OFFLINE_PUZZLE_LIMIT)
    for (const n of [1, 2, 3, 5, 1000]) expect(kept).toContain(id(n))
    expect(kept).not.toContain(id(4))
  })

  it('resolves without throwing when the storage fails', async () => {
    const original = globalThis.indexedDB
    vi.spyOn(original, 'open').mockImplementation(() => {
      throw new Error('blocked')
    })
    expect(await savePuzzle(response(1))).toBe(false)
    expect(await readPuzzle(id(1))).toBeNull()
    expect(await listStoredPuzzles()).toEqual([])
    vi.restoreAllMocks()
    globalThis.indexedDB = new IDBFactory()
  })
})

describe('known progress', () => {
  it('is written only for stored puzzles and validated on read', async () => {
    await writeKnownProgress(USER, makeProgress())
    expect(await readKnownProgress(USER, PUZZLE_ID)).toBeNull()
    await savePuzzle(makePuzzleResponse(TINY))
    await writeKnownProgress(USER, makeProgress())
    expect(await readKnownProgress(USER, PUZZLE_ID)).toEqual(makeProgress())
    expect(await readKnownProgress(OTHER, PUZZLE_ID)).toBeNull()
  })

  it('drops an invalid record', async () => {
    await savePuzzle(makePuzzleResponse(TINY))
    const db = await openDB(OFFLINE_DB_NAME)
    await db.put('known-progress', { userId: USER, puzzleId: PUZZLE_ID, progress: { x: 1 } })
    db.close()
    expect(await readKnownProgress(USER, PUZZLE_ID)).toBeNull()
  })

  it('deletes by user, or all except one user', async () => {
    await savePuzzle(makePuzzleResponse(TINY))
    await writeKnownProgress(USER, makeProgress())
    await writeKnownProgress(OTHER, makeProgress())
    await clearKnownProgress(USER, { except: true })
    expect(await readKnownProgress(USER, PUZZLE_ID)).not.toBeNull()
    expect(await readKnownProgress(OTHER, PUZZLE_ID)).toBeNull()
    await clearKnownProgress(USER)
    expect(await readKnownProgress(USER, PUZZLE_ID)).toBeNull()
  })
})
