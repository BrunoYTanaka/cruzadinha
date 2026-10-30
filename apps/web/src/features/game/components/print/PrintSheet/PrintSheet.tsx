import { puzzleSourceNames, type Puzzle } from '@cruzadinha/shared'
import type { CSSProperties } from 'react'
import { createPortal } from 'react-dom'
import { attributionLine } from '../../../helpers/attribution'
import { printClues, printDate } from '../../../helpers/print-clues'
import styles from './PrintSheet.module.css'

// Folha de impressão (feature 055). Só recebe a parte pública do puzzle: não há propriedade para a
// solução nem para o estado do jogo, então nenhuma letra pode chegar ao papel. Fica fora da tela e
// é a única coisa visível ao imprimir.
export function PrintSheet({ puzzle }: { puzzle: Puzzle }) {
  const { across, down } = printClues(puzzle.words)
  const lists = [
    { title: 'Horizontais', words: across },
    { title: 'Verticais', words: down },
  ]
  return createPortal(
    <div className={styles.sheet} role="region" aria-label="Folha de impressão">
      <h2 className={styles.title}>
        {puzzleSourceNames[puzzle.source]} · {printDate(puzzle.date)}
      </h2>
      <div
        className={styles.grid}
        style={{ '--cols': puzzle.grid.width } as CSSProperties}
        role="img"
        aria-label="Grade em branco"
      >
        {puzzle.grid.cells.flatMap((row, r) =>
          row.map((cell, c) =>
            cell.kind === 'block' ? (
              <svg
                key={`${r}-${c}`}
                className={styles.block}
                viewBox="0 0 10 10"
                aria-hidden="true"
              >
                <rect width="10" height="10" fill="#000" />
              </svg>
            ) : (
              <span key={`${r}-${c}`} className={styles.cell}>
                {cell.number}
              </span>
            ),
          ),
        )}
      </div>
      <div className={styles.clues}>
        {lists.map(({ title, words }) => (
          <section key={title} className={styles.list}>
            <h3>{title}</h3>
            <ul>
              {words.map((word) => (
                <li key={`${word.number}${word.direction}`}>
                  <b>{word.number}.</b> {word.clue} ({word.length})
                </li>
              ))}
            </ul>
          </section>
        ))}
      </div>
      <p className={styles.attribution}>{attributionLine(puzzle)}</p>
    </div>,
    document.body,
  )
}
