import { describe, expect, it } from 'vitest'
import { addDaysToIsoDate, candidateDates, todayInSaoPaulo } from './dates'

describe('todayInSaoPaulo', () => {
  it('ainda é o dia anterior em Brasília logo depois da meia-noite UTC', () => {
    expect(todayInSaoPaulo(() => new Date('2026-10-14T01:30:00Z'))).toBe('2026-10-13')
  })

  it('usa o mesmo dia ao meio-dia UTC', () => {
    expect(todayInSaoPaulo(() => new Date('2026-10-13T12:00:00Z'))).toBe('2026-10-13')
  })

  it('vira o dia às 03:00 UTC', () => {
    expect(todayInSaoPaulo(() => new Date('2026-10-14T03:00:00Z'))).toBe('2026-10-14')
  })
})

describe('addDaysToIsoDate', () => {
  it('volta um dia atravessando o mês', () => {
    expect(addDaysToIsoDate('2026-03-01', -1)).toBe('2026-02-28')
  })

  it('atravessa o ano', () => {
    expect(addDaysToIsoDate('2026-01-01', -1)).toBe('2025-12-31')
    expect(addDaysToIsoDate('2025-12-31', 1)).toBe('2026-01-01')
  })
})

describe('candidateDates', () => {
  it('com 0 dias de histórico traz só hoje', () => {
    expect(candidateDates('2026-10-13', 0)).toEqual(['2026-10-13'])
  })

  it('com 2 dias traz hoje e os dois anteriores, em ordem decrescente', () => {
    expect(candidateDates('2026-10-13', 2)).toEqual(['2026-10-13', '2026-10-12', '2026-10-11'])
  })

  it('com 31 dias cruza o mês sem repetir data', () => {
    const dates = candidateDates('2026-10-13', 31)
    expect(dates).toHaveLength(32)
    expect(new Set(dates).size).toBe(32)
    expect(dates[0]).toBe('2026-10-13')
    expect(dates[31]).toBe('2026-09-12')
  })
})
