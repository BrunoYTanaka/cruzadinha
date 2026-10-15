import { useLayoutEffect, useState, type CSSProperties, type RefObject } from 'react'
import {
  clampWidth,
  clearLibraryWidth,
  loadLibraryWidth,
  MAX_WIDTH,
  saveLibraryWidth,
} from './library-width'

type Measure = { width: number; available: number }

function px(value: string): number {
  const parsed = Number.parseFloat(value)
  return Number.isFinite(parsed) ? parsed : 0
}

// Largura atual do calendário (o conteúdo da página) e o espaço que ele poderia ocupar (a largura do
// pai, sem as margens laterais da página).
function measure(page: HTMLElement): Measure | null {
  const style = getComputedStyle(page)
  const gutters = px(style.paddingLeft) + px(style.paddingRight)
  const width = page.clientWidth - gutters
  const available = (page.parentElement?.clientWidth ?? 0) - gutters
  if (width <= 0 || available <= 0) return null
  return { width, available }
}

// Largura escolhida do calendário no computador. `ready` indica que a página (e a ref) já está na
// tela; sem medida (jsdom), a alça usa 1600 px como máximo e o CSS resolve o resto.
export function useLibraryWidth(
  pageRef: RefObject<HTMLElement | null>,
  { enabled, ready }: { enabled: boolean; ready: boolean },
) {
  const [chosen, setChosen] = useState<number | null>(() => (enabled ? loadLibraryWidth() : null))
  // Lida de novo quando o layout de computador passa a valer; enquanto não vale, é ignorada, mas
  // nunca apagada.
  const [wasEnabled, setWasEnabled] = useState(enabled)
  if (enabled !== wasEnabled) {
    setWasEnabled(enabled)
    setChosen(enabled ? loadLibraryWidth() : null)
  }
  const [measured, setMeasured] = useState<Measure | null>(null)

  useLayoutEffect(() => {
    const page = pageRef.current
    if (!enabled || !ready || !page) {
      setMeasured(null)
      return
    }
    const update = () => {
      const next = measure(page)
      setMeasured((current) =>
        current?.width === next?.width && current?.available === next?.available ? current : next,
      )
    }
    update()
    window.addEventListener('resize', update)
    const observer = typeof ResizeObserver === 'function' ? new ResizeObserver(update) : null
    observer?.observe(page)
    if (page.parentElement) observer?.observe(page.parentElement)
    return () => {
      window.removeEventListener('resize', update)
      observer?.disconnect()
    }
  }, [pageRef, enabled, ready])

  if (!enabled) return null
  const available = measured?.available ?? MAX_WIDTH
  const max = Math.min(MAX_WIDTH, available)
  const width = chosen === null ? Math.round(measured?.width ?? max) : clampWidth(chosen, available)
  // A largura escolhida vale para a coluna inteira da biblioteca (título, aviso, mês e legenda).
  const style =
    chosen === null
      ? undefined
      : ({ '--library-width': `calc(${width}px + 2 * var(--gutter))` } as CSSProperties)
  return {
    width,
    max,
    isAuto: chosen === null,
    style,
    preview: setChosen,
    commit: (value: number) => {
      setChosen(value)
      saveLibraryWidth(value)
    },
    reset: () => {
      setChosen(null)
      clearLibraryWidth()
    },
  }
}
