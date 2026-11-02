import { describe, expect, it } from 'vitest'
import { LOADING_SCREENS, SLOW_MESSAGE } from './loading-screens'

describe('LOADING_SCREENS', () => {
  it('tem as cinco telas, cada uma com título e palavra de letras', () => {
    expect(Object.keys(LOADING_SCREENS).sort()).toEqual([
      'day',
      'entry',
      'game',
      'library',
      'stats',
    ])
    for (const { title, word } of Object.values(LOADING_SCREENS)) {
      expect(title.length).toBeGreaterThan(0)
      expect(word).toMatch(/^\p{L}+$/u)
    }
  })

  it('usa os textos aprovados', () => {
    expect(LOADING_SCREENS.entry).toEqual({ title: 'Preparando as palavras…', word: 'CRUZADA' })
    expect(LOADING_SCREENS.library.word).toBe('CALENDÁRIO')
    expect(SLOW_MESSAGE).toContain('tirou uma soneca')
  })
})
