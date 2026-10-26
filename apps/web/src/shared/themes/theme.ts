import type { ThemeSetting } from '@cruzadinha/shared'
import { getSettings, subscribeSettings, updateSettings } from '../services/settings-store'

export type Theme = ThemeSetting

// Escolha guardada nas configurações (feature 021).
export function readTheme(): Theme {
  return getSettings().theme
}

export function saveTheme(theme: Theme): void {
  updateSettings({ theme })
}

// Mantém o `data-theme` igual à configuração. Toda mudança passa por aqui sem animação; a troca
// animada do botão de tema acontece dentro de uma View Transition, que captura esta aplicação.
export function installThemeSync(root: HTMLElement = document.documentElement): () => void {
  applyTheme(readTheme(), root)
  return subscribeSettings((record) => applyTheme(record.settings.theme, root))
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
  return theme === 'auto' ? 'Automático' : theme === 'light' ? 'Claro' : 'Escuro'
}
