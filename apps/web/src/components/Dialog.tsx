import { useEffect, useId, useRef, type ReactNode, type RefObject } from 'react'
import { createPortal } from 'react-dom'
import { buttonClass } from './Button'
import styles from './Dialog.module.css'

const FOCUSABLE =
  'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'

type DialogProps = {
  open: boolean
  onClose: () => void
  title: string
  description?: ReactNode
  children?: ReactNode
  // Elemento que recebe o foco ao abrir; sem ele, o marcado com `data-autofocus` ou o primeiro.
  initialFocusRef?: RefObject<HTMLElement | null>
  closeOnBackdrop?: boolean
  align?: 'center' | 'bottom'
  // Botão "Fechar" (X) ao lado do título, para diálogos sem ação final (feature 021).
  closeButton?: boolean
}

// Diálogo acessível: `role="dialog"`, título e descrição ligados, foco preso, `Esc` fecha e o foco
// volta ao elemento de origem.
export function Dialog({
  open,
  onClose,
  title,
  description,
  children,
  initialFocusRef,
  closeOnBackdrop = false,
  align = 'center',
  closeButton = false,
}: DialogProps) {
  const titleId = useId()
  const descriptionId = useId()
  const panelRef = useRef<HTMLDivElement>(null)

  const onCloseRef = useRef(onClose)
  useEffect(() => {
    onCloseRef.current = onClose
  })

  useEffect(() => {
    if (!open) return
    const previous = document.activeElement instanceof HTMLElement ? document.activeElement : null
    const panel = panelRef.current
    const target =
      initialFocusRef?.current ??
      panel?.querySelector<HTMLElement>('[data-autofocus]') ??
      panel?.querySelector<HTMLElement>(FOCUSABLE) ??
      panel
    target?.focus()

    const root = document.getElementById('root')
    root?.setAttribute('inert', '')

    function onKeyDown(event: KeyboardEvent) {
      const current = panelRef.current
      if (!current) return
      if (event.key === 'Escape') {
        event.stopPropagation()
        onCloseRef.current()
        return
      }
      if (event.key !== 'Tab') return
      const items = Array.from(current.querySelectorAll<HTMLElement>(FOCUSABLE))
      if (items.length === 0) {
        event.preventDefault()
        current.focus()
        return
      }
      const first = items[0]
      const last = items[items.length - 1]
      const active = document.activeElement
      if (event.shiftKey && (active === first || active === current)) {
        event.preventDefault()
        last?.focus()
      } else if (!event.shiftKey && (active === last || !current.contains(active))) {
        event.preventDefault()
        first?.focus()
      }
    }

    function onPointerDown(event: PointerEvent) {
      if (!closeOnBackdrop) return
      const current = panelRef.current
      if (current && event.target instanceof Node && !current.contains(event.target)) {
        onCloseRef.current()
      }
    }

    document.addEventListener('keydown', onKeyDown, true)
    document.addEventListener('pointerdown', onPointerDown, true)
    return () => {
      document.removeEventListener('keydown', onKeyDown, true)
      document.removeEventListener('pointerdown', onPointerDown, true)
      root?.removeAttribute('inert')
      if (previous?.isConnected) previous.focus()
    }
  }, [open, initialFocusRef, closeOnBackdrop])

  if (!open) return null

  return createPortal(
    <div className={`${styles.backdrop} ${align === 'bottom' ? styles.bottom : ''}`}>
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={description ? descriptionId : undefined}
        tabIndex={-1}
        className={styles.panel}
      >
        {closeButton ? (
          <div className={styles.header}>
            <h2 id={titleId} className={styles.title}>
              {title}
            </h2>
            <button
              type="button"
              className={`${buttonClass({ variant: 'icon' })} ${styles.close}`}
              aria-label="Fechar"
              onClick={() => onCloseRef.current()}
            >
              <svg viewBox="0 0 24 24" aria-hidden="true">
                <path d="M6 6l12 12M18 6L6 18" />
              </svg>
            </button>
          </div>
        ) : (
          <h2 id={titleId} className={styles.title}>
            {title}
          </h2>
        )}
        {description ? (
          <p id={descriptionId} className={styles.description}>
            {description}
          </p>
        ) : null}
        {children}
      </div>
    </div>,
    document.body,
  )
}
