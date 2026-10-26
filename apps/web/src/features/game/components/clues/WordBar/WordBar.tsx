import type { Word } from '@cruzadinha/shared'
import type { PuzzleIndex } from '../../../../../domain/game/navigation'
import { cellKey, type Position } from '../../../../../domain/game/state'
import { directionName } from '../ClueBar/ClueBar'
import styles from './WordBar.module.css'

type WordBarProps = {
  word: Word | null
  index: PuzzleIndex
  cells: (string | null)[][]
  selected: Position | null
}

// A palavra ativa ampliada, acima do teclado do celular, para ver as letras e tocar com precisão
// mesmo com as células pequenas. É redundante com a dica e com o tabuleiro: fica fora da leitura
// de tela.
export function WordBar({ word, index, cells, selected }: WordBarProps) {
  if (!word) return null
  const positions = index.cellsOf(word)
  return (
    <div className={styles.bar} aria-hidden="true" data-testid="word-bar">
      <span className={styles.clue}>
        <b>
          {word.number} {directionName(word.direction)}
        </b>{' '}
        {word.clue}
      </span>
      <span className={styles.letters}>
        {positions.map((position) => {
          const active = selected !== null && cellKey(position) === cellKey(selected)
          return (
            <span
              key={cellKey(position)}
              className={`${styles.letter} ${active ? styles.active : ''}`}
            >
              {cells[position.row]?.[position.col] ?? ''}
            </span>
          )
        })}
      </span>
    </div>
  )
}
