import type { Word } from '@cruzadinha/shared'
import { useEffect, useRef, useState, type PointerEvent } from 'react'
import { wordKey } from '../../game-logic/clue-strike'
import styles from './ClueBar.module.css'

// Tempo com o mouse parado sobre a dica cortada antes de o balão com a dica inteira abrir.
const HOVER_DELAY_MS = 500

export function directionName(direction: Word['direction']): string {
  return direction === 'across' ? 'Horizontal' : 'Vertical'
}

type ClueBarProps = {
  word: Word | null
  // No computador a barra fica acima do tabuleiro, com botões para a dica anterior e a próxima.
  onPrevious?: () => void
  onNext?: () => void
}

// A dica da palavra ativa, acima do tabuleiro. É uma região viva: quando a seleção muda de
// palavra, o leitor de tela anuncia a nova dica. Uma dica cortada pelas reticências aparece
// inteira num balão quando o mouse para sobre ela (feature 018).
export function ClueBar({ word, onPrevious, onNext }: ClueBarProps) {
  const navigable = onPrevious !== undefined && onNext !== undefined
  // A chave da palavra para a qual o balão abriu: outra palavra ativa o fecha sozinha.
  const [openFor, setOpenFor] = useState<string | null>(null)
  const text = useRef<HTMLSpanElement>(null)
  const timer = useRef<number | undefined>(undefined)
  const open = word !== null && openFor === wordKey(word)

  useEffect(() => () => window.clearTimeout(timer.current), [])

  useEffect(() => {
    if (!open) return
    // Sem impedir o evento: o Esc do tabuleiro (feature 011) continua valendo.
    function onKey(event: KeyboardEvent) {
      if (event.key === 'Escape') setOpenFor(null)
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [open])

  // Conta o tempo desde o último movimento: o balão abre com o mouse parado, e um movimento sobre a
  // dica tenta de novo se ela ainda não estava cortada (por exemplo, se o jogo abriu sob o mouse).
  function onTextPointer(event: PointerEvent<HTMLSpanElement>) {
    if (event.pointerType === 'touch' || word === null || open) return
    const key = wordKey(word)
    window.clearTimeout(timer.current)
    timer.current = window.setTimeout(() => {
      const span = text.current
      if (span && span.scrollWidth > span.clientWidth) setOpenFor(key)
    }, HOVER_DELAY_MS)
  }

  function onBarLeave() {
    window.clearTimeout(timer.current)
    setOpenFor(null)
  }

  const live = (
    <div className={styles.live} aria-live="polite" aria-atomic="true">
      {word ? (
        <>
          <b className={styles.number}>
            {word.number} {directionName(word.direction)}
          </b>
          <span
            ref={text}
            className={styles.text}
            onPointerEnter={onTextPointer}
            onPointerMove={onTextPointer}
            onPointerLeave={() => window.clearTimeout(timer.current)}
          >
            {word.clue}
          </span>
        </>
      ) : (
        <span className={styles.text}>Escolha uma célula para começar.</span>
      )}
    </div>
  )
  // Só visual: a região viva já anuncia a dica inteira.
  const full =
    open && word ? (
      <div className={styles.full} aria-hidden="true" data-testid="full-clue">
        {word.clue}
      </div>
    ) : null
  if (!navigable) {
    return (
      <div className={styles.bar} onPointerLeave={onBarLeave}>
        {live}
        {full}
      </div>
    )
  }
  return (
    <div className={`${styles.bar} ${styles.navigable}`} onPointerLeave={onBarLeave}>
      <button type="button" className={styles.step} aria-label="Dica anterior" onClick={onPrevious}>
        <svg viewBox="0 0 24 24" aria-hidden="true" className={styles.icon}>
          <path d="M15 5l-7 7 7 7" />
        </svg>
      </button>
      {live}
      <button type="button" className={styles.step} aria-label="Próxima dica" onClick={onNext}>
        <svg viewBox="0 0 24 24" aria-hidden="true" className={styles.icon}>
          <path d="M9 5l7 7-7 7" />
        </svg>
      </button>
      {full}
    </div>
  )
}
