import { describe, expect, it } from 'vitest'
import { monthOptions, periodText, resolveJump } from './jump'

const today = '2026-10-14'

describe('resolveJump', () => {
  it('aceita hoje, uma data comum e o primeiro dia do primeiro mês navegável', () => {
    expect(resolveJump(today, today)).toEqual({
      ok: true,
      month: { year: 2026, month: 10 },
      date: today,
    })
    expect(resolveJump('2026-07-03', today)).toMatchObject({ ok: true, month: { month: 7 } })
    expect(resolveJump('2025-10-01', today)).toMatchObject({ ok: true })
  })

  it('recusa data impossível ou mal formada', () => {
    expect(resolveJump('2026-02-31', today)).toEqual({ ok: false, reason: 'invalid' })
    expect(resolveJump('14/10/2026', today)).toEqual({ ok: false, reason: 'invalid' })
  })

  it('recusa amanhã e o dia antes do primeiro mês navegável', () => {
    expect(resolveJump('2026-10-15', today)).toEqual({ ok: false, reason: 'future' })
    expect(resolveJump('2025-09-30', today)).toEqual({ ok: false, reason: 'too-old' })
  })
})

describe('monthOptions e periodText', () => {
  it('lista 13 meses, do atual ao mais antigo, em português', () => {
    const options = monthOptions(today)
    expect(options).toHaveLength(13)
    expect(options[0]).toMatchObject({ value: '2026-10', label: 'outubro de 2026' })
    expect(options[12]).toMatchObject({ value: '2025-10', label: 'outubro de 2025' })
  })

  it('descreve o período aceito', () => {
    expect(periodText(today)).toBe('de outubro de 2025 até hoje')
  })
})
