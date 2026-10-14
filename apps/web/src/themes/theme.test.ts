import { afterEach, describe, expect, it, vi } from 'vitest'
import { applyTheme, nextTheme, readTheme, saveTheme, themeLabel, THEME_KEY } from './theme'

afterEach(() => {
  vi.restoreAllMocks()
  window.localStorage.clear()
  document.documentElement.removeAttribute('data-theme')
})

describe('theme', () => {
  it('começa em automático e ignora valores inválidos', () => {
    expect(readTheme()).toBe('auto')
    window.localStorage.setItem(THEME_KEY, 'roxo')
    expect(readTheme()).toBe('auto')
  })

  it('grava e lê a escolha', () => {
    saveTheme('dark')
    expect(window.localStorage.getItem(THEME_KEY)).toBe('dark')
    expect(readTheme()).toBe('dark')
  })

  it('aplica data-theme só quando há escolha explícita', () => {
    applyTheme('dark')
    expect(document.documentElement.getAttribute('data-theme')).toBe('dark')
    applyTheme('light')
    expect(document.documentElement.getAttribute('data-theme')).toBe('light')
    applyTheme('auto')
    expect(document.documentElement.hasAttribute('data-theme')).toBe(false)
  })

  it('alterna auto, claro, escuro e volta', () => {
    expect(nextTheme('auto')).toBe('light')
    expect(nextTheme('light')).toBe('dark')
    expect(nextTheme('dark')).toBe('auto')
    expect([themeLabel('auto'), themeLabel('light'), themeLabel('dark')]).toEqual([
      'Auto',
      'Claro',
      'Escuro',
    ])
  })

  it('segue funcionando sem armazenamento', () => {
    vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
      throw new Error('bloqueado')
    })
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('bloqueado')
    })
    expect(readTheme()).toBe('auto')
    expect(() => saveTheme('dark')).not.toThrow()
  })
})
