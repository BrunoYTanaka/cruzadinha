import { describe, expect, it } from 'vitest'
import {
  addMonths,
  daysInMonth,
  firstWeekday,
  monthKey,
  parseIsoDate,
  todayInBrasilia,
  toIsoDate,
} from './dates'

describe('todayInBrasilia', () => {
  it('usa a data de Brasília perto da meia-noite', () => {
    // 02:30 UTC de 15/10 ainda é 23:30 de 14/10 em Brasília (UTC-3)
    expect(todayInBrasilia(new Date('2026-10-15T02:30:00Z'))).toBe('2026-10-14')
    // 03:00 UTC de 15/10 já é 00:00 de 15/10 em Brasília
    expect(todayInBrasilia(new Date('2026-10-15T03:00:00Z'))).toBe('2026-10-15')
  })
})

describe('datas do calendário', () => {
  it('monta chaves e datas com zeros à esquerda', () => {
    expect(toIsoDate(2026, 3, 5)).toBe('2026-03-05')
    expect(monthKey({ year: 2026, month: 3 })).toBe('2026-03')
  })

  it('valida datas AAAA-MM-DD', () => {
    expect(parseIsoDate('2026-10-14')).toEqual({ year: 2026, month: 10, day: 14 })
    expect(parseIsoDate('2026-02-30')).toBeNull()
    expect(parseIsoDate('14/10/2026')).toBeNull()
  })

  it('soma meses atravessando o ano', () => {
    expect(addMonths({ year: 2026, month: 1 }, -1)).toEqual({ year: 2025, month: 12 })
    expect(addMonths({ year: 2026, month: 12 }, 1)).toEqual({ year: 2027, month: 1 })
    expect(addMonths({ year: 2026, month: 10 }, -12)).toEqual({ year: 2025, month: 10 })
  })

  it('conta dias e acha o primeiro dia da semana (domingo = 0)', () => {
    expect(daysInMonth({ year: 2026, month: 2 })).toBe(28)
    expect(daysInMonth({ year: 2028, month: 2 })).toBe(29)
    // 1º de outubro de 2026 é quinta-feira
    expect(firstWeekday({ year: 2026, month: 10 })).toBe(4)
  })
})
