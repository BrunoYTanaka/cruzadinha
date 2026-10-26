import { describe, expect, it } from 'vitest'
import { formatElapsed, formatWait, MAX_ELAPSED_MS, spokenElapsed } from './time'

describe('formatElapsed', () => {
  it('formata mm:ss e h:mm:ss', () => {
    expect(formatElapsed(0)).toBe('00:00')
    expect(formatElapsed(468_000)).toBe('07:48')
    expect(formatElapsed(3_599_000)).toBe('59:59')
    expect(formatElapsed(3_600_000)).toBe('1:00:00')
    expect(formatElapsed(3_725_000)).toBe('1:02:05')
  })

  it('limita o tempo ao máximo de 7 dias e ignora negativos', () => {
    expect(formatElapsed(-5)).toBe('00:00')
    expect(formatElapsed(MAX_ELAPSED_MS * 2)).toBe(formatElapsed(MAX_ELAPSED_MS))
  })
})

describe('formatWait', () => {
  it('usa segundos até 59 e minutos arredondados para cima depois', () => {
    expect(formatWait(1)).toBe('1 s')
    expect(formatWait(59)).toBe('59 s')
    expect(formatWait(60)).toBe('1 min')
    expect(formatWait(61)).toBe('2 min')
    expect(formatWait(900)).toBe('15 min')
  })

  it('arredonda frações para cima e nunca mostra zero', () => {
    expect(formatWait(0.2)).toBe('1 s')
    expect(formatWait(0)).toBe('1 s')
  })
})

describe('spokenElapsed', () => {
  it('escreve o tempo por extenso', () => {
    expect(spokenElapsed(468_000)).toBe('7 minutos e 48 segundos')
    expect(spokenElapsed(61_000)).toBe('1 minuto e 1 segundo')
    expect(spokenElapsed(3_600_000)).toBe('1 hora')
    expect(spokenElapsed(0)).toBe('0 segundos')
  })
})
