import { describe, expect, it } from 'vitest'
import {
  decideGuestReset,
  decideGuestSave,
  type GuestProgress,
  type GuestSave,
} from './guest-progress'

const PUZZLE_ID = '0b9a3a4e-6d0e-4b6c-9a52-1f2e3d4c5b6a'
const now = new Date('2026-10-16T12:00:00.000Z')
const later = (seconds: number) => new Date(now.getTime() + seconds * 1000).toISOString()

function save(overrides: Partial<GuestSave> = {}): GuestSave {
  return {
    puzzleId: PUZZLE_ID,
    date: '2026-10-16',
    cells: [
      ['A', null],
      [null, null],
    ],
    elapsedMs: 5_000,
    status: 'in_progress',
    savedAt: later(0),
    help: null,
    ...overrides,
  }
}

function record(overrides: Partial<GuestProgress> = {}): GuestProgress {
  return {
    v: 1,
    ...save(),
    completedAt: null,
    finishedMs: null,
    bestMs: null,
    bestAt: null,
    ...overrides,
  }
}

function applied(decision: ReturnType<typeof decideGuestSave>): GuestProgress {
  if (decision.kind !== 'apply') throw new Error('esperava apply')
  return decision.next
}

describe('decideGuestSave em andamento', () => {
  it('sem registro grava tudo, sem conclusão nem recorde', () => {
    expect(applied(decideGuestSave(null, save(), now))).toEqual(record())
  })

  it('ignora um salvamento mais antigo que o guardado (outra aba)', () => {
    const current = record({ savedAt: later(10) })
    expect(decideGuestSave(current, save({ savedAt: later(5) }), now)).toEqual({
      kind: 'unchanged',
    })
  })

  it('em andamento para em andamento troca letras, tempo, ajudas e savedAt, e mantém o recorde', () => {
    const help = {
      usage: { letters: 1, words: 0 },
      marks: { '0,0': 'helped' as const },
      locked: [],
    }
    const current = record({ bestMs: 300_000, bestAt: later(-100) })
    const next = applied(
      decideGuestSave(
        current,
        save({
          cells: [
            ['A', 'B'],
            [null, null],
          ],
          elapsedMs: 9_000,
          savedAt: later(3),
          help,
        }),
        now,
      ),
    )
    expect(next).toMatchObject({
      cells: [
        ['A', 'B'],
        [null, null],
      ],
      elapsedMs: 9_000,
      savedAt: later(3),
      help,
      status: 'in_progress',
      bestMs: 300_000,
      bestAt: later(-100),
    })
  })

  it('uma cruzada concluída não volta a andamento por um salvamento', () => {
    const current = record({ status: 'completed', completedAt: later(0), finishedMs: 5_000 })
    expect(decideGuestSave(current, save({ savedAt: later(20) }), now)).toEqual({
      kind: 'unchanged',
    })
  })
})

describe('decideGuestSave na conclusão', () => {
  it('concluir grava a hora, o tempo final e o primeiro recorde', () => {
    const next = applied(
      decideGuestSave(
        record(),
        save({ status: 'completed', elapsedMs: 412_000, savedAt: later(1) }),
        now,
      ),
    )
    expect(next).toMatchObject({
      status: 'completed',
      completedAt: now.toISOString(),
      finishedMs: 412_000,
      bestMs: 412_000,
      bestAt: now.toISOString(),
    })
  })

  it('concluir sem registro anterior também grava o recorde', () => {
    const next = applied(
      decideGuestSave(null, save({ status: 'completed', elapsedMs: 9_000 }), now),
    )
    expect(next).toMatchObject({ finishedMs: 9_000, bestMs: 9_000, bestAt: now.toISOString() })
  })

  it('um tempo pior mantém o recorde e a data dele', () => {
    const current = record({ bestMs: 300_000, bestAt: later(-500) })
    const next = applied(
      decideGuestSave(
        current,
        save({ status: 'completed', elapsedMs: 400_000, savedAt: later(1) }),
        now,
      ),
    )
    expect(next).toMatchObject({ finishedMs: 400_000, bestMs: 300_000, bestAt: later(-500) })
  })

  it('um tempo melhor vira o recorde', () => {
    const current = record({ bestMs: 300_000, bestAt: later(-500) })
    const next = applied(
      decideGuestSave(
        current,
        save({ status: 'completed', elapsedMs: 200_000, savedAt: later(1) }),
        now,
      ),
    )
    expect(next).toMatchObject({ bestMs: 200_000, bestAt: now.toISOString() })
  })

  it('concluir de novo uma concluída não muda nada', () => {
    const current = record({ status: 'completed', completedAt: later(0), finishedMs: 5_000 })
    expect(decideGuestSave(current, save({ status: 'completed', savedAt: later(9) }), now)).toEqual(
      { kind: 'unchanged' },
    )
  })
})

describe('decideGuestReset', () => {
  it('zera letras, tempo, ajudas e conclusão e mantém o recorde', () => {
    const current = record({
      status: 'completed',
      completedAt: later(0),
      finishedMs: 412_000,
      bestMs: 398_000,
      bestAt: later(-900),
      help: { usage: { letters: 2, words: 1 }, marks: {}, locked: ['0,0'] },
    })
    expect(decideGuestReset(current, now)).toEqual({
      ...current,
      cells: [
        [null, null],
        [null, null],
      ],
      elapsedMs: 0,
      status: 'in_progress',
      savedAt: now.toISOString(),
      completedAt: null,
      finishedMs: null,
      help: null,
      bestMs: 398_000,
      bestAt: later(-900),
    })
  })
})
