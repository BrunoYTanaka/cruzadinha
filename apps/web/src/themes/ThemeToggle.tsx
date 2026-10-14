import { useState } from 'react'
import { Button } from '../components/Button'
import { applyTheme, nextTheme, readTheme, saveTheme, themeLabel } from './theme'

// Alterna automático → claro → escuro → automático. O modo atual aparece por texto.
export function ThemeToggle() {
  const [theme, setTheme] = useState(readTheme)
  function toggle() {
    const next = nextTheme(theme)
    applyTheme(next)
    saveTheme(next)
    setTheme(next)
  }
  return (
    <Button variant="ghost" onClick={toggle} aria-label={`Tema: ${themeLabel(theme)}. Trocar tema`}>
      <span aria-hidden="true">Tema: {themeLabel(theme)}</span>
    </Button>
  )
}
