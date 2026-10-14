import type { Word } from '@cruzadinha/shared'
import styles from './ClueBar.module.css'

export function directionName(direction: Word['direction']): string {
  return direction === 'across' ? 'Horizontal' : 'Vertical'
}

// A dica da palavra ativa, acima do tabuleiro. É uma região viva: quando a seleção muda de
// palavra, o leitor de tela anuncia a nova dica.
export function ClueBar({ word }: { word: Word | null }) {
  return (
    <div className={styles.bar} aria-live="polite" aria-atomic="true">
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
}
