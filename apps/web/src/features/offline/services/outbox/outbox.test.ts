import { beforeEach, describe, expect, it } from 'vitest'
import type { SaveProgressRequest } from '@cruzadinha/shared'
import {
  applyOutboxEvent,
  decideOutbox,
  listOutboxes,
  outboxKey,
  readOutbox,
  readOutboxItems,
  type OutboxItem,
} from './outbox'

const USER = '3f1c9a52-1a2b-4c3d-8e4f-0123456789ab'
const OTHER = '9a8b7c6d-5e4f-4a3b-9c2d-1e0f9a8b7c6d'
const PUZZLE = '0b9a3a4e-6d0e-4b6c-9a52-1f2e3d4c5b6a'
const at = (s: number) => new Date(Date.UTC(2026, 9, 16, 12, 0, s)).toISOString()
const body = (s: number): SaveProgressRequest => ({
  cells: [['A', null]],
  elapsedMs: s * 1000,
  status: 'in_progress',
  savedAt: at(s),
})
const save = (s: number): OutboxItem => ({ kind: 'save', body: body(s) })
const reset = (s: number): OutboxItem => ({ kind: 'reset', at: at(s) })

beforeEach(() => localStorage.clear())

describe('decideOutbox', () => {
  it('keeps only the latest save', () => {
    expect(decideOutbox([save(1)], { type: 'save', body: body(2) })).toEqual([save(2)])
  })

  it('a reset replaces everything', () => {
    expect(decideOutbox([reset(1), save(2)], { type: 'reset', at: at(3) })).toEqual([reset(3)])
    expect(decideOutbox([save(1)], { type: 'reset', at: at(3) })).toEqual([reset(3)])
  })

  it('keeps the order [reset, save]', () => {
    expect(decideOutbox([reset(1)], { type: 'save', body: body(2) })).toEqual([reset(1), save(2)])
    expect(decideOutbox([reset(1), save(2)], { type: 'save', body: body(3) })).toEqual([
      reset(1),
      save(3),
    ])
  })

  it('a confirmed reset leaves the rest', () => {
    expect(decideOutbox([reset(1), save(2)], { type: 'reset-confirmed' })).toEqual([save(2)])
    expect(decideOutbox([save(2)], { type: 'reset-confirmed' })).toEqual([save(2)])
  })

  it('a confirmed save empties only when savedAt is not older', () => {
    expect(decideOutbox([save(2)], { type: 'save-confirmed', savedAt: at(2) })).toEqual([])
    expect(decideOutbox([save(3)], { type: 'save-confirmed', savedAt: at(2) })).toEqual([save(3)])
    expect(decideOutbox([reset(1), save(2)], { type: 'save-confirmed', savedAt: at(5) })).toEqual([
      reset(1),
    ])
  })

  it('drops a reset when the server progress is later, keeping the save', () => {
    expect(decideOutbox([reset(1), save(5)], { type: 'server-progress', savedAt: at(3) })).toEqual([
      save(5),
    ])
    expect(decideOutbox([reset(4)], { type: 'server-progress', savedAt: at(3) })).toEqual([
      reset(4),
    ])
  })
})

describe('storage', () => {
  it('reads the old format (body only) as a save', () => {
    localStorage.setItem(outboxKey(USER, PUZZLE), JSON.stringify(body(1)))
    expect(readOutboxItems(USER, PUZZLE)).toEqual([save(1)])
    expect(readOutbox(USER, PUZZLE)).toEqual(body(1))
  })

  it('writes a lone save in the old format and a reset in the new one', () => {
    applyOutboxEvent(USER, PUZZLE, { type: 'save', body: body(1) })
    expect(JSON.parse(localStorage.getItem(outboxKey(USER, PUZZLE)) ?? '')).toEqual(body(1))
    applyOutboxEvent(USER, PUZZLE, { type: 'reset', at: at(2) })
    applyOutboxEvent(USER, PUZZLE, { type: 'save', body: body(3) })
    expect(JSON.parse(localStorage.getItem(outboxKey(USER, PUZZLE)) ?? '')).toEqual({
      v: 2,
      items: [reset(2), save(3)],
    })
    expect(readOutboxItems(USER, PUZZLE)).toEqual([reset(2), save(3)])
  })

  it('removes the key when nothing is left', () => {
    applyOutboxEvent(USER, PUZZLE, { type: 'save', body: body(1) })
    applyOutboxEvent(USER, PUZZLE, { type: 'save-confirmed', savedAt: at(1) })
    expect(localStorage.getItem(outboxKey(USER, PUZZLE))).toBeNull()
  })

  it.each(['{', '"x"', JSON.stringify({ v: 2, items: [] }), JSON.stringify({ v: 2, items: [{}] })])(
    'ignores invalid content %s',
    (raw) => {
      localStorage.setItem(outboxKey(USER, PUZZLE), raw)
      expect(readOutboxItems(USER, PUZZLE)).toEqual([])
      expect(readOutbox(USER, PUZZLE)).toBeNull()
    },
  )

  it('lists the outboxes of every account, skipping invalid ones', () => {
    applyOutboxEvent(USER, PUZZLE, { type: 'save', body: body(1) })
    applyOutboxEvent(OTHER, PUZZLE, { type: 'reset', at: at(1) })
    localStorage.setItem(outboxKey(OTHER, 'broken'), '{')
    localStorage.setItem('unrelated', 'x')
    expect(listOutboxes()).toEqual(
      expect.arrayContaining([
        { userId: USER, puzzleId: PUZZLE },
        { userId: OTHER, puzzleId: PUZZLE },
      ]),
    )
    expect(listOutboxes()).toHaveLength(2)
  })
})
