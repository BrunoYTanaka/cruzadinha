import { describe, expect, it } from 'vitest'
import { clampShift } from './tooltip-position'

describe('clampShift', () => {
  it('não desloca quando o balão cabe', () => {
    expect(clampShift(100, 80, 400)).toBe(0)
  })

  it('desloca para a esquerda o que passa da borda direita, deixando a margem', () => {
    // right = 380 + 60 = 440 numa janela de 400: precisa subir 48 (40 + margem de 8).
    expect(clampShift(380, 60, 400)).toBe(-48)
  })

  it('desloca para a direita o que passa da borda esquerda, deixando a margem', () => {
    expect(clampShift(-12, 60, 400)).toBe(20)
  })

  it('encosta exatamente na margem sem deslocar', () => {
    expect(clampShift(8, 100, 400)).toBe(0)
    expect(clampShift(292, 100, 400)).toBe(0)
  })

  it('alinha à esquerda quando o balão é mais largo que a janela útil', () => {
    expect(clampShift(-20, 500, 400)).toBe(28)
  })

  it('aceita outra margem', () => {
    expect(clampShift(380, 60, 400, 0)).toBe(-40)
  })
})
