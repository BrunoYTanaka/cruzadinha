import { describe, expect, it } from 'vitest'
import { normalizeLetter, plainLetter } from './letters'

describe('normalizeLetter', () => {
  it('aceita A a Z em maiúsculas e minúsculas', () => {
    expect(normalizeLetter('a')).toBe('A')
    expect(normalizeLetter('Z')).toBe('Z')
    expect(normalizeLetter('m')).toBe('M')
  })

  it('aceita o Ç e o mantém', () => {
    expect(normalizeLetter('ç')).toBe('Ç')
    expect(normalizeLetter('Ç')).toBe('Ç')
  })

  it('converte letras acentuadas na letra simples', () => {
    expect(normalizeLetter('á')).toBe('A')
    expect(normalizeLetter('ã')).toBe('A')
    expect(normalizeLetter('â')).toBe('A')
    expect(normalizeLetter('é')).toBe('E')
    expect(normalizeLetter('ê')).toBe('E')
    expect(normalizeLetter('í')).toBe('I')
    expect(normalizeLetter('ó')).toBe('O')
    expect(normalizeLetter('õ')).toBe('O')
    expect(normalizeLetter('ú')).toBe('U')
    expect(normalizeLetter('Ü')).toBe('U')
  })

  it('rejeita números, símbolos, espaço e teclas de controle', () => {
    for (const key of ['1', '-', ' ', '.', 'Backspace', 'Enter', 'Tab', 'ArrowLeft', 'Shift', '']) {
      expect(normalizeLetter(key)).toBeNull()
    }
  })

  it('rejeita mais de um caractere e letras sem equivalente simples', () => {
    expect(normalizeLetter('ab')).toBeNull()
    expect(normalizeLetter('ß')).toBeNull()
    expect(normalizeLetter('世')).toBeNull()
  })
})

describe('plainLetter', () => {
  it('tira o acento da letra da solução e mantém o Ç', () => {
    expect(plainLetter('Ã')).toBe('A')
    expect(plainLetter('É')).toBe('E')
    expect(plainLetter('Ç')).toBe('Ç')
    expect(plainLetter('K')).toBe('K')
  })
})
