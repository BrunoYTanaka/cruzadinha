import { describe, expect, it } from 'vitest'
import { guestProgressRecordSchema } from './guest-record'

const valid = {
  v: 1,
  puzzleId: '0b9a3a4e-6d0e-4b6c-9a52-1f2e3d4c5b6a',
  date: '2026-10-16',
  cells: [
    ['A', null],
    [null, null],
  ],
  elapsedMs: 5_000,
  status: 'in_progress',
  savedAt: '2026-10-16T12:00:00.000Z',
  completedAt: null,
  finishedMs: null,
  bestMs: 398_000,
  bestAt: '2026-10-10T09:12:45.000Z',
  help: { usage: { letters: 1, words: 0 }, marks: { '0,0': 'helped' }, locked: ['0,0'] },
}

describe('guestProgressRecordSchema', () => {
  it('aceita um registro completo da versão 1', () => {
    expect(guestProgressRecordSchema.parse(valid)).toEqual(valid)
    expect(guestProgressRecordSchema.safeParse({ ...valid, help: null }).success).toBe(true)
  })

  it.each([
    ['outra versão', { v: 2 }],
    ['tempo negativo', { elapsedMs: -1 }],
    ['tempo acima do teto', { elapsedMs: 604_800_001 }],
    ['recorde sem data', { bestAt: null }],
    ['data do recorde sem recorde', { bestMs: null }],
    ['situação desconhecida', { status: 'paused' }],
    ['savedAt que não é instante', { savedAt: 'ontem' }],
    ['puzzleId que não é UUID', { puzzleId: 'abc' }],
  ])('recusa %s', (_case, change) => {
    expect(guestProgressRecordSchema.safeParse({ ...valid, ...change }).success).toBe(false)
  })

  it('recusa qualquer campo a mais, como a solução', () => {
    expect(guestProgressRecordSchema.safeParse({ ...valid, solution: [['A']] }).success).toBe(false)
  })

  it('recusa o que não é objeto', () => {
    expect(guestProgressRecordSchema.safeParse('texto').success).toBe(false)
    expect(guestProgressRecordSchema.safeParse(null).success).toBe(false)
  })
})
