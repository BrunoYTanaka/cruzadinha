import type { CSSProperties } from 'react'
import styles from './CrosswordCells.module.css'

// As casas da tela de espera (feature 059): uma por letra, a primeira numerada, acendendo em onda.
// É só decoração, então fica oculta do leitor de tela; quem lê é o título.
export function CrosswordCells({ word, still = false }: { word: string; still?: boolean }) {
  return (
    <div className={`${styles.cells} ${still ? styles.still : ''}`} aria-hidden="true">
      {[...word].map((letter, index) => (
        <span key={index} className={styles.cell} style={{ '--i': index } as CSSProperties}>
          {letter}
          {index === 0 ? <small>1</small> : null}
        </span>
      ))}
    </div>
  )
}
