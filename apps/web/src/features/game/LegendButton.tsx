import { useEffect, useId, useRef, useState } from 'react'
import { buttonClass } from '../../shared/components/Button'
import styles from './LegendButton.module.css'

const ITEMS: { className: string; label: string }[] = [
  { className: styles.empty ?? '', label: 'Vazia' },
  { className: styles.word ?? '', label: 'Palavra ativa' },
  { className: styles.selected ?? '', label: 'Selecionada' },
  { className: styles.helped ?? '', label: 'Com ajuda' },
  { className: styles.wrong ?? '', label: 'Errada na verificação' },
]

// Botão redondo "?" no canto: abre e fecha a legenda das cores do tabuleiro. Começa escondida.
export function LegendButton() {
  const [open, setOpen] = useState(false)
  const id = useId()
  const root = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    function onKey(event: KeyboardEvent) {
      if (event.key === 'Escape') setOpen(false)
    }
    function onPointer(event: PointerEvent) {
      if (root.current && !root.current.contains(event.target as Node)) setOpen(false)
    }
    document.addEventListener('keydown', onKey)
    document.addEventListener('pointerdown', onPointer)
    return () => {
      document.removeEventListener('keydown', onKey)
      document.removeEventListener('pointerdown', onPointer)
    }
  }, [open])

  return (
    <div className={styles.root} ref={root}>
      {open ? (
        <div id={id} className={styles.panel} role="group" aria-label="Legenda do tabuleiro">
          <ul>
            {ITEMS.map((item) => (
              <li key={item.label}>
                <span className={`${styles.swatch} ${item.className}`} aria-hidden="true" />
                {item.label}
              </li>
            ))}
          </ul>
        </div>
      ) : null}
      <button
        type="button"
        className={`${buttonClass({ variant: 'primary' })} ${styles.button}`}
        aria-label="Legenda do tabuleiro"
        aria-expanded={open}
        aria-controls={open ? id : undefined}
        onClick={() => setOpen((value) => !value)}
      >
        ?
      </button>
    </div>
  )
}
