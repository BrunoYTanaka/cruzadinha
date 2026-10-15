import { useLayoutEffect, useState, type RefObject } from 'react'

export type Space = { width: number; height: number }

// Altura de uma linha da barra da dica ativa e o espaço entre ela e a grade. O cálculo usa a altura
// mínima, e não a medida, para o tabuleiro não mudar de tamanho a cada dica.
const CLUE_BAR = 56
const BAR_GAP = 12
const COLUMN_GAP = 24
const FALLBACK_CLUES_WIDTH = 560

function px(value: string): number {
  const parsed = Number.parseFloat(value)
  return Number.isFinite(parsed) ? parsed : 0
}

function measure(body: HTMLElement): Space | null {
  const style = getComputedStyle(body)
  const cluesWidth =
    px(getComputedStyle(document.documentElement).getPropertyValue('--clues-width')) ||
    FALLBACK_CLUES_WIDTH
  const width =
    body.clientWidth - px(style.paddingLeft) - px(style.paddingRight) - cluesWidth - COLUMN_GAP
  const top = body.getBoundingClientRect().top + window.scrollY
  const height =
    window.innerHeight - top - px(style.paddingTop) - px(style.paddingBottom) - CLUE_BAR - BAR_GAP
  // Sem layout (jsdom) as medidas dão zero: vale o CSS da feature 010.
  if (body.clientWidth <= 0 || width <= 0 || height <= 0) return null
  return { width, height }
}

function same(a: Space | null, b: Space | null): boolean {
  return a === b || (a !== null && b !== null && a.width === b.width && a.height === b.height)
}

// Espaço disponível para a grade no layout de computador: a largura do corpo da tela de jogo sem a
// coluna de dicas, e a altura da janela abaixo do topo do corpo, sem a barra da dica ativa. Mede
// antes da pintura, para o tabuleiro não aparecer num tamanho e pular para outro.
export function useMeasuredSpace(ref: RefObject<HTMLElement | null>, enabled: boolean) {
  const [space, setSpace] = useState<Space | null>(null)

  useLayoutEffect(() => {
    const body = ref.current
    if (!enabled || !body) {
      setSpace(null)
      return
    }
    const update = () => {
      const next = measure(body)
      setSpace((current) => (same(current, next) ? current : next))
    }
    update()
    window.addEventListener('resize', update)
    const observer = typeof ResizeObserver === 'function' ? new ResizeObserver(update) : null
    observer?.observe(body)
    return () => {
      window.removeEventListener('resize', update)
      observer?.disconnect()
    }
  }, [ref, enabled])

  return space
}
