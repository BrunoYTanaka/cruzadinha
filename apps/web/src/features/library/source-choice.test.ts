import { afterEach, describe, expect, it, vi } from 'vitest'
import { loadSourceChoice, saveSourceChoice, SOURCE_KEY } from './source-choice'

afterEach(() => {
  vi.restoreAllMocks()
  window.localStorage.clear()
})

describe('preferência de fonte', () => {
  it('sem valor guardado vale O Globo', () => {
    expect(loadSourceChoice()).toBe('oglobo')
  })

  it('lê a fonte gravada', () => {
    saveSourceChoice('cruzadaonline')
    expect(window.localStorage.getItem(SOURCE_KEY)).toBe('cruzadaonline')
    expect(loadSourceChoice()).toBe('cruzadaonline')
  })

  it.each(['publico', '{"source":"oglobo"', ''])('valor inválido (%s) vale O Globo', (value) => {
    window.localStorage.setItem(SOURCE_KEY, value)
    expect(loadSourceChoice()).toBe('oglobo')
  })

  it('armazenamento que lança não quebra a leitura nem a gravação', () => {
    vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
      throw new Error('bloqueado')
    })
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('bloqueado')
    })
    expect(() => saveSourceChoice('cruzadaonline')).not.toThrow()
    expect(loadSourceChoice()).toBe('oglobo')
  })
})
