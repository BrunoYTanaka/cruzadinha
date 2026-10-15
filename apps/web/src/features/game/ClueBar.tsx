import type { Word } from '@cruzadinha/shared'
import styles from './ClueBar.module.css'

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
// palavra, o leitor de tela anuncia a nova dica.
export function ClueBar({ word, onPrevious, onNext }: ClueBarProps) {
  const navigable = onPrevious !== undefined && onNext !== undefined
  const live = (
    <div className={styles.live} aria-live="polite" aria-atomic="true">
      {word ? (
        <>
          <b className={styles.number}>
            {word.number} {directionName(word.direction)}
          </b>
          <span className={styles.text}>{word.clue}</span>
        </>
      ) : (
        <span className={styles.text}>Escolha uma célula para começar.</span>
      )}
    </div>
  )
  if (!navigable) return <div className={styles.bar}>{live}</div>
  return (
    <div className={`${styles.bar} ${styles.navigable}`}>
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
    </div>
  )
}
