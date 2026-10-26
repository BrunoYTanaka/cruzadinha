import { useState, type MouseEvent } from 'react'
import { flushSync } from 'react-dom'
import { Tooltip } from '../../components/Tooltip/Tooltip'
import { buttonClass } from '../../components/Button/Button'
import { VisuallyHidden } from '../../components/VisuallyHidden/VisuallyHidden'
import { updateSettings, useSettings } from '../../services/settings-store/settings-store'
import { nextTheme, themeLabel, type Theme } from '../theme/theme'
import { startThemeTransition } from '../theme-transition/theme-transition'
import styles from './ThemeButton.module.css'

// Ordem fixa dos rótulos empilhados; não é a ordem do ciclo (`nextTheme`).
const THEMES: Theme[] = ['auto', 'light', 'dark']

function ThemeIcon({ theme }: { theme: Theme }) {
  // Remonta a cada tema (`key` no uso) para a animação de entrada do ícone tocar de novo.
  switch (theme) {
    case 'light':
      return (
        <svg viewBox="0 0 24 24" aria-hidden="true" className={styles.icon}>
          <circle cx="12" cy="12" r="4.2" />
          <path d="M12 2.5v2.2M12 19.3v2.2M2.5 12h2.2M19.3 12h2.2M5.3 5.3l1.6 1.6M17.1 17.1l1.6 1.6M5.3 18.7l1.6-1.6M17.1 6.9l1.6-1.6" />
        </svg>
      )
    case 'dark':
      return (
        <svg viewBox="0 0 24 24" aria-hidden="true" className={styles.icon}>
          <path d="M20.5 14.2A8.5 8.5 0 1 1 9.8 3.5a6.8 6.8 0 0 0 10.7 10.7z" />
        </svg>
      )
    case 'auto':
      return (
        <svg viewBox="0 0 24 24" aria-hidden="true" className={styles.icon}>
          <circle cx="12" cy="12" r="8.5" />
          <path d="M12 3.5a8.5 8.5 0 0 1 0 17z" className={styles.fill} />
        </svg>
      )
  }
}

// Botão único de tema nas configurações (feature 021): cada toque passa ao próximo, na ordem
// claro → escuro → automático, com o ícone animado e a página trocando num círculo a partir dele.
export function ThemeButton() {
  const { theme } = useSettings()
  const next = nextTheme(theme)
  const [announcement, setAnnouncement] = useState('')

  function onClick(event: MouseEvent<HTMLButtonElement>) {
    const rect = event.currentTarget.getBoundingClientRect()
    const target = next
    startThemeTransition(
      // A View Transition fotografa o DOM quando a função termina: o ícone novo entra junto.
      () => flushSync(() => updateSettings({ theme: target })),
      { x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 },
    )
    setAnnouncement(`Tema ${themeLabel(target).toLowerCase()}`)
  }

  return (
    <>
      <Tooltip label={`Mudar para ${themeLabel(next).toLowerCase()}`} placement="above">
        <button
          type="button"
          className={`${buttonClass()} ${styles.button}`}
          aria-label={`Tema: ${themeLabel(theme).toLowerCase()}. Mudar para ${themeLabel(next).toLowerCase()}`}
          onClick={onClick}
        >
          <ThemeIcon key={theme} theme={theme} />
          {/* Os três rótulos na mesma célula: o botão tem sempre a largura do mais largo, e só o do
              tema atual aparece (feature 024). O nome acessível vem do aria-label. */}
          <span aria-hidden="true" className={styles.label}>
            {THEMES.map((option) => (
              <span key={option} data-label data-active={option === theme ? '' : undefined}>
                {themeLabel(option)}
              </span>
            ))}
          </span>
        </button>
      </Tooltip>
      <VisuallyHidden role="status" aria-live="polite">
        {announcement}
      </VisuallyHidden>
    </>
  )
}
