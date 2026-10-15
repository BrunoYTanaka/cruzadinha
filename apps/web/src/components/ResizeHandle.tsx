import { useEffect, useRef, type KeyboardEvent, type PointerEvent } from 'react'
import styles from './ResizeHandle.module.css'

export type DragDelta = { startValue: number; dx: number; dy: number }

export type ResizeHandleProps = {
  value: number
  min: number
  max: number
  // Passo das setas do teclado.
  step: number
  label: string
  valueText: (value: number) => string
  // Converte o deslocamento do ponteiro em valor. Cada tela decide a conta: com o conteúdo
  // centralizado, a borda anda metade do que ele cresce, então a largura conta em dobro.
  fromDrag: (delta: DragDelta) => number
  // Valor ao vivo, durante o arraste e a cada tecla.
  onChange: (value: number) => void
  // Valor a guardar: ao soltar o ponteiro, num arraste interrompido e a cada tecla.
  onCommit: (value: number) => void
  // Clique duplo: volta ao padrão.
  onReset: () => void
  variant: 'corner' | 'edge'
  // Só desenho e ponteiro: some do leitor de tela e do Tab (uma alça repetida, como a pegada de canto
  // do calendário).
  decorative?: boolean
  className?: string
  // Avisado quando um arraste com o ponteiro termina.
  onDragEnd?: () => void
}

type Drag = { pointerId: number; x: number; y: number; startValue: number; last: number }

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, Math.round(value)))
}

// Alça de redimensionar, como a borda de uma janela: arrastar com o ponteiro muda o valor ao vivo
// e grava ao soltar; com o foco nela, setas, Home e End fazem o mesmo pelo teclado.
export function ResizeHandle({
  value,
  min,
  max,
  step,
  label,
  valueText,
  fromDrag,
  onChange,
  onCommit,
  onReset,
  variant,
  decorative = false,
  className,
  onDragEnd,
}: ResizeHandleProps) {
  const drag = useRef<Drag | null>(null)
  const frame = useRef<number | null>(null)
  const reported = useRef(value)

  useEffect(
    () => () => {
      if (frame.current !== null) cancelAnimationFrame(frame.current)
    },
    [],
  )

  function report(next: number) {
    if (next === reported.current) return
    reported.current = next
    onChange(next)
  }

  function onPointerDown(event: PointerEvent<HTMLDivElement>) {
    if (event.button !== 0) return
    event.preventDefault()
    // O jsdom não tem captura do ponteiro; no navegador ela mantém o arraste fora da alça.
    event.currentTarget.setPointerCapture?.(event.pointerId)
    reported.current = value
    drag.current = {
      pointerId: event.pointerId,
      x: event.clientX,
      y: event.clientY,
      startValue: value,
      last: value,
    }
  }

  function onPointerMove(event: PointerEvent<HTMLDivElement>) {
    const current = drag.current
    if (!current || current.pointerId !== event.pointerId) return
    current.last = clamp(
      fromDrag({
        startValue: current.startValue,
        dx: event.clientX - current.x,
        dy: event.clientY - current.y,
      }),
      min,
      max,
    )
    // Um quadro por vez: o tabuleiro tem mais de cem células para redesenhar.
    if (frame.current === null && typeof requestAnimationFrame === 'function') {
      frame.current = requestAnimationFrame(() => {
        frame.current = null
        if (drag.current) report(drag.current.last)
      })
    }
  }

  function finish(event: PointerEvent<HTMLDivElement>) {
    const current = drag.current
    if (!current || current.pointerId !== event.pointerId) return
    drag.current = null
    if (frame.current !== null) {
      cancelAnimationFrame(frame.current)
      frame.current = null
    }
    report(current.last)
    onCommit(current.last)
    onDragEnd?.()
  }

  function onKeyDown(event: KeyboardEvent<HTMLDivElement>) {
    let next: number | null = null
    if (event.key === 'ArrowLeft' || event.key === 'ArrowDown') next = value - step
    else if (event.key === 'ArrowRight' || event.key === 'ArrowUp') next = value + step
    else if (event.key === 'Home') next = min
    else if (event.key === 'End') next = max
    if (next === null) return
    event.preventDefault()
    const bounded = clamp(next, min, max)
    reported.current = bounded
    onChange(bounded)
    onCommit(bounded)
  }

  const classes = [styles.handle, styles[variant], className ?? ''].filter(Boolean).join(' ')
  const pointer = {
    onPointerDown,
    onPointerMove,
    onPointerUp: finish,
    onPointerCancel: finish,
    onLostPointerCapture: finish,
    onDoubleClick: onReset,
  }

  if (decorative) {
    return (
      // Pegada visual que repete uma alça acessível ao lado; o teclado e o leitor de tela usam a outra.
      <div className={classes} aria-hidden="true" tabIndex={-1} {...pointer}>
        <Grip variant={variant} />
      </div>
    )
  }

  return (
    <div
      className={classes}
      role="slider"
      tabIndex={0}
      aria-label={label}
      aria-orientation="horizontal"
      aria-valuemin={min}
      aria-valuemax={max}
      aria-valuenow={value}
      aria-valuetext={valueText(value)}
      onKeyDown={onKeyDown}
      {...pointer}
    >
      <Grip variant={variant} />
    </div>
  )
}

function Grip({ variant }: { variant: ResizeHandleProps['variant'] }) {
  if (variant === 'edge') return <span className={styles.bar} aria-hidden="true" />
  return (
    <svg viewBox="0 0 24 24" className={styles.icon} aria-hidden="true">
      <path d="M19 9 9 19M19 14l-5 5M19 4 4 19" />
    </svg>
  )
}
