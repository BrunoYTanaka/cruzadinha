import {
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type PointerEvent,
  type ReactNode,
} from 'react'
import { clampShift } from './tooltip-position'
import styles from './Tooltip.module.css'

// Tempo com o mouse parado antes de o balão abrir (o mesmo do balão da dica). Foco abre já.
export const TOOLTIP_DELAY_MS = 500

type TooltipProps = {
  // Texto do balão. O alvo já tem o mesmo nome acessível; o balão é só visual.
  label: string
  placement?: 'below' | 'above'
  children: ReactNode
}

function isKeyboardFocus(target: EventTarget): boolean {
  try {
    return (target as Element).matches(':focus-visible')
  } catch {
    return true // shortcut: navegador sem :focus-visible mantém o comportamento antigo
  }
}

// Balão curto sobre um botão de ícone (feature 021): aparece com o mouse parado em cima (após `TOOLTIP_DELAY_MS`) ou com o
// foco do teclado, nunca com toque, e fecha com Esc. Não muda o layout (posição absoluta). Fica
// centrado no alvo e só se desloca na horizontal o que precisar para caber na janela (feature 024).
export function Tooltip({ label, placement = 'below', children }: TooltipProps) {
  const [open, setOpen] = useState(false)
  const tipRef = useRef<HTMLSpanElement>(null)
  const timer = useRef<number>(undefined)
  const stopTimer = () => window.clearTimeout(timer.current)
  useEffect(() => stopTimer, [])

  // Esc fecha o balão sem parar o evento: o diálogo ou o tabuleiro em volta ainda o recebem.
  useEffect(() => {
    if (!open) return
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setOpen(false)
    }
    document.addEventListener('keydown', onKeyDown)
    return () => document.removeEventListener('keydown', onKeyDown)
  }, [open])

  // Mede o balão sem deslocamento e grava o que falta para caber. É direto no DOM, antes da
  // pintura: não há estado novo, então não há laço de render nem piscada. O resize recalcula, e o
  // ResizeObserver cobre a largura do texto mudar com a janela parada (fonte que termina de
  // carregar depois que o balão abriu); o deslocamento não muda o tamanho, então não há laço.
  useLayoutEffect(() => {
    const tip = tipRef.current
    if (!open || !tip) return
    const place = () => {
      tip.style.setProperty('--tip-shift', '0px')
      const { left, width } = tip.getBoundingClientRect()
      const shift = clampShift(left, width, document.documentElement.clientWidth)
      tip.style.setProperty('--tip-shift', `${shift}px`)
    }
    place()
    window.addEventListener('resize', place)
    const observer = typeof ResizeObserver === 'undefined' ? null : new ResizeObserver(place)
    observer?.observe(tip)
    return () => {
      window.removeEventListener('resize', place)
      observer?.disconnect()
    }
  }, [open, label])

  const onPointerEnter = (event: PointerEvent) => {
    if (event.pointerType === 'touch') return
    stopTimer()
    timer.current = window.setTimeout(() => setOpen(true), TOOLTIP_DELAY_MS)
  }
  const close = () => {
    stopTimer()
    setOpen(false)
  }

  return (
    <span
      className={styles.wrap}
      onPointerEnter={onPointerEnter}
      onPointerLeave={close}
      onFocus={(event) => {
        stopTimer()
        // Só foco de teclado: foco por clique ou devolvido ao botão (ao fechar um diálogo) não abre o balão.
        if (!isKeyboardFocus(event.target)) return
        setOpen(true)
      }}
      onBlur={close}
    >
      {children}
      {open ? (
        <span
          ref={tipRef}
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
