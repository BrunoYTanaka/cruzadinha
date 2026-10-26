import type { LibraryItem } from '@cruzadinha/shared'
import { describe, expect, it } from 'vitest'
import { buildMonth, compareMonths, currentMonth, dayState, firstNavigableMonth } from './calendar'

const today = '2026-10-14'

function item(date: string, overrides: Partial<LibraryItem> = {}): LibraryItem {
  return {
    puzzleId: `00000000-0000-4000-8000-${date.replaceAll('-', '').padStart(12, '0')}`,
    source: 'oglobo',
    date,
    level: 'daily',
    status: 'not_started',
    elapsedMs: null,
    finishedMs: null,
    completedAt: null,
    bestMs: null,
    bestAt: null,
    ...overrides,
  }
}

describe('buildMonth', () => {
  it('começa no domingo: outubro de 2026 começa numa quinta, com 4 dias em branco', () => {
    const view = buildMonth({ year: 2026, month: 10 }, today, [])
    expect(view.leadingBlanks).toBe(4)
    expect(view.days).toHaveLength(31)
    expect(view.days[0]).toMatchObject({ date: '2026-10-01', day: 1 })
  })

  it('marca hoje pela data de Brasília', () => {
    const view = buildMonth({ year: 2026, month: 10 }, today, [])
    expect(view.days.filter((day) => day.isToday).map((day) => day.date)).toEqual(['2026-10-14'])
    expect(buildMonth({ year: 2026, month: 9 }, today, []).days.some((day) => day.isToday)).toBe(
      false,
    )
  })

  it('usa a situação do usuário nos dias guardados', () => {
    const items = [
      item('2026-10-13', { status: 'completed', finishedMs: 412_000 }),
      item('2026-10-12', { status: 'in_progress', elapsedMs: 5_000 }),
      item('2026-10-11'),
    ]
    const days = buildMonth({ year: 2026, month: 10 }, today, items).days
    expect(days[12]?.state).toMatchObject({ kind: 'completed', finishedMs: 412_000 })
    expect(days[11]?.state).toMatchObject({ kind: 'in_progress' })
    expect(days[10]?.state).toMatchObject({ kind: 'not_started' })
  })

  it('dia futuro é futuro e passado não guardado pode ser buscado', () => {
    const days = buildMonth({ year: 2026, month: 10 }, today, [item('2026-10-14')]).days
    expect(days[13]?.state.kind).toBe('not_started')
    expect(days[14]?.state.kind).toBe('future')
    expect(days[30]?.state.kind).toBe('future')
    expect(days[0]?.state.kind).toBe('fetchable')
  })

  it('lembra os dias em que a fonte disse que não há cruzada', () => {
    const days = buildMonth({ year: 2026, month: 10 }, today, [], new Set(['2026-10-03'])).days
    expect(days[2]?.state.kind).toBe('none')
    expect(days[1]?.state.kind).toBe('fetchable')
  })

  it('o dia guardado vale mais que a lembrança de "sem cruzada"', () => {
    const days = buildMonth(
      { year: 2026, month: 10 },
      today,
      [item('2026-10-03')],
      new Set(['2026-10-03']),
    ).days
    expect(days[2]?.state.kind).toBe('not_started')
  })
})

describe('limites de navegação', () => {
  it('permite voltar até 12 meses antes de hoje', () => {
    expect(firstNavigableMonth(today)).toEqual({ year: 2025, month: 10 })
    expect(currentMonth(today)).toEqual({ year: 2026, month: 10 })
    expect(compareMonths({ year: 2025, month: 10 }, { year: 2026, month: 10 })).toBeLessThan(0)
    expect(compareMonths({ year: 2026, month: 10 }, { year: 2026, month: 10 })).toBe(0)
  })
})

describe('dayState', () => {
  const byDate = (...items: LibraryItem[]) => new Map(items.map((entry) => [entry.date, entry]))

  it('item guardado: a situação vem da biblioteca, com o id do puzzle', () => {
    const done = item('2026-10-10', { status: 'completed', finishedMs: 90_000 })
    expect(dayState('2026-10-10', today, byDate(done), new Set())).toEqual({
      kind: 'completed',
      finishedMs: 90_000,
      puzzleId: done.puzzleId,
    })
    const playing = item('2026-10-11', { status: 'in_progress' })
    expect(dayState('2026-10-11', today, byDate(playing), new Set())).toEqual({
      kind: 'in_progress',
      puzzleId: playing.puzzleId,
    })
    const fresh = item('2026-10-12')
    expect(dayState('2026-10-12', today, byDate(fresh), new Set())).toEqual({
      kind: 'not_started',
      puzzleId: fresh.puzzleId,
    })
  })

  it('sem item: futuro, sem cruzada ou buscável (inclusive hoje)', () => {
    expect(dayState('2026-10-15', today, byDate(), new Set())).toEqual({ kind: 'future' })
    expect(dayState('2026-10-13', today, byDate(), new Set(['2026-10-13']))).toEqual({
      kind: 'none',
    })
    expect(dayState('2026-10-13', today, byDate(), new Set())).toEqual({ kind: 'fetchable' })
    expect(dayState(today, today, byDate(), new Set())).toEqual({ kind: 'fetchable' })
  })
})
