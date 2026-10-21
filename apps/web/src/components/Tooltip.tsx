import { useEffect, useState, type PointerEvent, type ReactNode } from 'react'
import styles from './Tooltip.module.css'

type TooltipProps = {
  // Texto do balão. O alvo já tem o mesmo nome acessível; o balão é só visual.
  label: string
  placement?: 'below' | 'above'
  children: ReactNode
}

// Balão curto sobre um botão de ícone (feature 021): aparece com o mouse parado em cima ou com o
// foco do teclado, nunca com toque, e fecha com Esc. Não muda o layout (posição absoluta).
export function Tooltip({ label, placement = 'below', children }: TooltipProps) {
  const [open, setOpen] = useState(false)

  // Esc fecha o balão sem parar o evento: o diálogo ou o tabuleiro em volta ainda o recebem.
  useEffect(() => {
    if (!open) return
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setOpen(false)
    }
    document.addEventListener('keydown', onKeyDown)
    return () => document.removeEventListener('keydown', onKeyDown)
  }, [open])

  const onPointerEnter = (event: PointerEvent) => {
    if (event.pointerType !== 'touch') setOpen(true)
  }

  return (
    <span
      className={styles.wrap}
      onPointerEnter={onPointerEnter}
      onPointerLeave={() => setOpen(false)}
      onFocus={() => setOpen(true)}
      onBlur={() => setOpen(false)}
    >
      {children}
      {open ? (
        <span
          data-tooltip
          aria-hidden="true"
          className={`${styles.tip} ${placement === 'above' ? styles.above : styles.below}`}
        >
          {label}
        </span>
      ) : null}
    </span>
  )
}
