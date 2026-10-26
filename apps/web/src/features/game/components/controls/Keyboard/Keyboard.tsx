import type { MouseEvent } from 'react'
import styles from './Keyboard.module.css'

const ROWS = ['QWERTYUIOP', 'ASDFGHJKLÇ', 'ZXCVBNM']

type KeyboardProps = {
  onLetter: (letter: string) => void
  onBackspace: () => void
  onClues: () => void
}

// Tocar numa tecla não tira o foco do tabuleiro, para um teclado físico seguir valendo.
function keepFocus(event: MouseEvent) {
  event.preventDefault()
}

export function Keyboard({ onLetter, onBackspace, onClues }: KeyboardProps) {
  return (
    <div className={styles.keyboard} role="group" aria-label="Teclado">
      {ROWS.map((letters, rowIndex) => (
        <div key={letters} className={styles.row}>
          {rowIndex === 2 ? (
            <button
              type="button"
              className={`${styles.key} ${styles.wide}`}
              onMouseDown={keepFocus}
              onClick={onClues}
            >
              Dicas
            </button>
          ) : null}
          {Array.from(letters).map((letter) => (
            <button
              key={letter}
              type="button"
              className={styles.key}
              onMouseDown={keepFocus}
              onClick={() => onLetter(letter)}
            >
              {letter}
            </button>
          ))}
          {rowIndex === 2 ? (
            <button
              type="button"
              className={`${styles.key} ${styles.wide}`}
              aria-label="Apagar"
              onMouseDown={keepFocus}
              onClick={onBackspace}
            >
              ⌫
            </button>
          ) : null}
        </div>
      ))}
    </div>
  )
}
