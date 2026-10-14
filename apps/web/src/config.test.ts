import { describe, expect, it } from 'vitest'
import { parseConfig } from './config'

describe('parseConfig', () => {
  it('usa 4 letras e 2 palavras quando as variáveis não existem', () => {
    expect(parseConfig({}).helpLimits).toEqual({ letters: 4, words: 2 })
    expect(
      parseConfig({ VITE_HELP_LETTER_LIMIT: '', VITE_HELP_WORD_LIMIT: '' }).helpLimits,
    ).toEqual({ letters: 4, words: 2 })
  })

  it('aceita inteiros de 0 a 99', () => {
    expect(
      parseConfig({ VITE_HELP_LETTER_LIMIT: '0', VITE_HELP_WORD_LIMIT: '99' }).helpLimits,
    ).toEqual({ letters: 0, words: 99 })
  })

  it.each(['-1', '100', '2.5', 'abc'])('aborta com mensagem clara para %s', (value) => {
    expect(() => parseConfig({ VITE_HELP_LETTER_LIMIT: value })).toThrow(
      /Configuração do site inválida: VITE_HELP_LETTER_LIMIT/,
    )
  })
})
