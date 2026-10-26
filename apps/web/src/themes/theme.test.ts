import { afterEach, describe, expect, it, vi } from 'vitest'
import { resetSettingsStore, SETTINGS_KEY } from '../shared/services/settings-store'
import { applyTheme, installThemeSync, nextTheme, readTheme, saveTheme, themeLabel } from './theme'

afterEach(() => {
  vi.restoreAllMocks()
  window.localStorage.clear()
  resetSettingsStore()
  document.documentElement.removeAttribute('data-theme')
})

describe('theme', () => {
  it('começa em automático e ignora valores inválidos', () => {
    expect(readTheme()).toBe('auto')
    window.localStorage.setItem('cruzadinha:theme', 'roxo')
    resetSettingsStore()
    expect(readTheme()).toBe('auto')
  })

  it('grava e lê a escolha nas configurações', () => {
    saveTheme('dark')
    expect(window.localStorage.getItem(SETTINGS_KEY)).toContain('"theme":"dark"')
    expect(readTheme()).toBe('dark')
  })

  it('installThemeSync aplica o tema atual e acompanha as mudanças', () => {
    saveTheme('dark')
    const stop = installThemeSync()
    expect(document.documentElement.getAttribute('data-theme')).toBe('dark')
    saveTheme('auto')
    expect(document.documentElement.hasAttribute('data-theme')).toBe(false)
    stop()
  })

  it('aplica data-theme só quando há escolha explícita', () => {
    applyTheme('dark')
    expect(document.documentElement.getAttribute('data-theme')).toBe('dark')
    applyTheme('light')
    expect(document.documentElement.getAttribute('data-theme')).toBe('light')
    applyTheme('auto')
    expect(document.documentElement.hasAttribute('data-theme')).toBe(false)
  })

  it('alterna claro, escuro, automático e volta (feature 021)', () => {
    expect(nextTheme('light')).toBe('dark')
    expect(nextTheme('dark')).toBe('auto')
    expect(nextTheme('auto')).toBe('light')
    expect([themeLabel('auto'), themeLabel('light'), themeLabel('dark')]).toEqual([
      'Automático',
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
