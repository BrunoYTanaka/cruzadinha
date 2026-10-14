import { readStorage, writeStorage } from '../lib/storage'

export type Theme = 'auto' | 'light' | 'dark'

export const THEME_KEY = 'cruzadinha:theme'

const THEMES: readonly Theme[] = ['auto', 'light', 'dark']

export function isTheme(value: unknown): value is Theme {
  return typeof value === 'string' && (THEMES as readonly string[]).includes(value)
}

export function readTheme(): Theme {
  const stored = readStorage(THEME_KEY)
  return isTheme(stored) ? stored : 'auto'
}

export function saveTheme(theme: Theme): void {
  writeStorage(THEME_KEY, theme)
}

// `auto` não define atributo: a preferência do sistema decide pelos tokens.
export function applyTheme(theme: Theme, root: HTMLElement = document.documentElement): void {
  if (theme === 'auto') root.removeAttribute('data-theme')
  else root.setAttribute('data-theme', theme)
}

export function nextTheme(theme: Theme): Theme {
  return theme === 'auto' ? 'light' : theme === 'light' ? 'dark' : 'auto'
}

export function themeLabel(theme: Theme): string {
  return theme === 'auto' ? 'Auto' : theme === 'light' ? 'Claro' : 'Escuro'
}
