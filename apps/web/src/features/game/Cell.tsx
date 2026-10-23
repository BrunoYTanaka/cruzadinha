import { memo } from 'react'
import type { HelpMark } from '../../game-logic/state'
import styles from './Cell.module.css'

export type CellProps = {
  id: string
  row: number
  col: number
  open: boolean
  number: number | null
  letter: string | null
  selected: boolean
  inWord: boolean
  mark: HelpMark | undefined
  label: string
  // Fim de palavra com vizinha colada: a barra é desenhada na borda direita (horizontal) ou
  // inferior (vertical) da célula.
  barAcross?: boolean
  barDown?: boolean
}

// Uma célula do tabuleiro. `memo`: digitar uma letra só redesenha as células que mudaram.
export const Cell = memo(function Cell({
  id,
  row,
  col,
  open,
  number,
  letter,
  selected,
  inWord,
  mark,
  label,
  barAcross,
  barDown,
}: CellProps) {
  if (!open) {
    return <div role="gridcell" aria-hidden="true" className={`${styles.cell} ${styles.block}`} />
  }
  const classes = [
    styles.cell,
    selected ? styles.selected : inWord ? styles.word : '',
    mark === 'helped' ? styles.helped : '',
    mark === 'wrong' ? styles.wrong : '',
  ]
    .filter(Boolean)
    .join(' ')
  return (
    <div
      role="gridcell"
      id={id}
      data-row={row}
      data-col={col}
      aria-selected={selected}
      data-in-word={inWord || undefined}
      data-bar-across={barAcross || undefined}
      data-bar-down={barDown || undefined}
      aria-label={label}
      className={classes}
    >
      {number !== null ? (
        <span className={styles.number} aria-hidden="true">
          {number}
        </span>
      ) : null}
      <span className={styles.letter} aria-hidden="true">
        {letter}
      </span>
    </div>
  )
})
