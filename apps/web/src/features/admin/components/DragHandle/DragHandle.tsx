import type { KeyboardEventHandler, Ref } from 'react'
import styles from './DragHandle.module.css'

type DragHandleProps = {
  // Ref de alça do dnd-kit: o arraste por ponteiro começa só por este botão.
  ref?: Ref<HTMLButtonElement>
  label: string
  describedBy: string
  grabbed: boolean
  onKeyDown: KeyboardEventHandler<HTMLButtonElement>
  onBlur: () => void
}

// Alça de seis pontos (44 px) para ordenar: arrastar com mouse ou toque, ou Espaço e setas pelo
// teclado (WCAG 2.5.7). `touch-action: none` impede a página de rolar durante o arraste.
export function DragHandle({
  ref,
  label,
  describedBy,
  grabbed,
  onKeyDown,
  onBlur,
}: DragHandleProps) {
  return (
    <button
      ref={ref}
      type="button"
      className={styles.handle}
      aria-label={label}
      aria-describedby={describedBy}
      aria-pressed={grabbed}
      onKeyDown={onKeyDown}
      onBlur={onBlur}
    >
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <circle cx="9" cy="6" r="1.6" />
        <circle cx="15" cy="6" r="1.6" />
        <circle cx="9" cy="12" r="1.6" />
        <circle cx="15" cy="12" r="1.6" />
        <circle cx="9" cy="18" r="1.6" />
        <circle cx="15" cy="18" r="1.6" />
      </svg>
    </button>
  )
}
