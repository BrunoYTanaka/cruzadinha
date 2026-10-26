import type { Word } from '@cruzadinha/shared'
import { useEffect, useLayoutEffect, useRef, useState, type PointerEvent } from 'react'
import { buttonClass } from '../../shared/components/Button'
import { wordKey } from '../../domain/game/clue-strike'
import styles from './ClueBar.module.css'
import { keepSelectionOnDoubleClick } from './useCopyClue'

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
  // Duplo clique no texto da dica copia o texto (feature 033); sem ele a opção está desligada.
  onCopy?: (word: Word) => void
}

// A dica da palavra ativa, acima do tabuleiro. É uma região viva: quando a seleção muda de
// palavra, o leitor de tela anuncia a nova dica. Uma dica cortada pelas reticências aparece
// inteira num balão quando o mouse para sobre ela (feature 018): acima da barra no computador,
// abaixo na barra sem botões, que na janela estreita fica abaixo do tabuleiro (feature 019).
// Anterior e próxima são botões de ícone (feature 023).
const step = `${buttonClass({ variant: 'icon' })} ${styles.step}`

export function ClueBar({ word, onPrevious, onNext, onCopy }: ClueBarProps) {
  const navigable = onPrevious !== undefined && onNext !== undefined
  // A chave da palavra para a qual o balão abriu: outra palavra ativa o fecha sozinha.
  const [openFor, setOpenFor] = useState<string | null>(null)
  // Lado da barra em que o balão abre; só muda algo no computador, onde o padrão é acima.
  const [placement, setPlacement] = useState<'above' | 'below'>('above')
  const balloon = useRef<HTMLDivElement>(null)
  const text = useRef<HTMLSpanElement>(null)
  const timer = useRef<number | undefined>(undefined)
  const open = word !== null && openFor === wordKey(word)

  useEffect(() => () => window.clearTimeout(timer.current), [])

  // Mede antes da pintura: se o topo do balão sairia da janela, ele abre abaixo da barra, e nunca
  // aparece cortado (FR-016).
  useLayoutEffect(() => {
    const element = balloon.current
    if (!open || !element) return
    if (element.getBoundingClientRect().top < 0) setPlacement('below')
  }, [open])

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
      if (span && span.scrollWidth > span.clientWidth) {
        setPlacement('above')
        setOpenFor(key)
      }
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
          {/* Atalho só de mouse (feature 033): o teclado já lê e seleciona a palavra pelo tabuleiro. */}
          {/* eslint-disable-next-line jsx-a11y/no-static-element-interactions */}
          <span
            ref={text}
            className={styles.text}
            onPointerEnter={onTextPointer}
            onPointerMove={onTextPointer}
            onPointerLeave={() => window.clearTimeout(timer.current)}
            onDoubleClick={onCopy ? () => onCopy(word) : undefined}
            onMouseDown={onCopy ? keepSelectionOnDoubleClick : undefined}
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
      <div
        ref={balloon}
        className={placement === 'below' ? `${styles.full} ${styles.below}` : styles.full}
        aria-hidden="true"
        data-testid="full-clue"
      >
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
      <button type="button" className={step} aria-label="Dica anterior" onClick={onPrevious}>
        <svg viewBox="0 0 24 24" aria-hidden="true" className={styles.icon}>
          <path d="M15 5l-7 7 7 7" />
        </svg>
      </button>
      {live}
      <button type="button" className={step} aria-label="Próxima dica" onClick={onNext}>
        <svg viewBox="0 0 24 24" aria-hidden="true" className={styles.icon}>
          <path d="M9 5l7 7-7 7" />
        </svg>
      </button>
      {full}
    </div>
  )
}
