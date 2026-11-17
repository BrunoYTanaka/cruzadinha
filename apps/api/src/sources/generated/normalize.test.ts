import { describe, expect, it } from 'vitest'
import { plain, plainWords } from './normalize'

describe('plain', () => {
  it('tira acentos e cedilha e passa a maiúsculas', () => {
    expect(plain('Coração')).toBe('CORACAO')
    expect(plain('ÁGUA')).toBe('AGUA')
    expect(plain('pinguim')).toBe('PINGUIM')
  })
})

describe('plainWords', () => {
  it('separa as palavras e ignora pontuação e números', () => {
    expect(plainWords('Órgão que bate, no peito! 2x')).toEqual([
      'ORGAO',
      'QUE',
      'BATE',
      'NO',
      'PEITO',
      'X',
    ])
  })
})
