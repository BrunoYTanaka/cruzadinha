import { describe, expect, it } from 'vitest'
import type { CalendarDay, DayState } from './calendar'
import { countByFilter, matchesFilter } from './status-filter'

const states: DayState[] = [
  { kind: 'completed', finishedMs: 1000, puzzleId: 'a' },
  { kind: 'in_progress', puzzleId: 'b' },
  { kind: 'not_started', puzzleId: 'c' },
  { kind: 'fetchable' },
  { kind: 'none' },
  { kind: 'future' },
]

const days = (list: DayState[]): CalendarDay[] =>
  list.map((state, index) => ({
    date: `2026-10-${index + 1}`,
    day: index + 1,
    isToday: false,
    state,
  }))

describe('matchesFilter', () => {
  it('"all" mantém todos os dias ativos, inclusive os sem status de jogo', () => {
    expect(states.every((state) => matchesFilter(state, 'all'))).toBe(true)
  })

  it.each(['completed', 'in_progress', 'not_started'] as const)(
    '"%s" deixa ativo só o dia com esse status',
    (filter) => {
      expect(states.filter((state) => matchesFilter(state, filter)).map((s) => s.kind)).toEqual([
        filter,
      ])
    },
  )
})

describe('countByFilter', () => {
  it('conta só dias guardados e soma "all"', () => {
    const list = days([...states, { kind: 'completed', finishedMs: null, puzzleId: 'd' }])
    expect(countByFilter(list)).toEqual({ all: 4, completed: 2, in_progress: 1, not_started: 1 })
  })

  it('sem dias guardados tudo é zero', () => {
    expect(countByFilter(days([{ kind: 'fetchable' }, { kind: 'future' }]))).toEqual({
      all: 0,
      completed: 0,
      in_progress: 0,
      not_started: 0,
    })
  })
})
