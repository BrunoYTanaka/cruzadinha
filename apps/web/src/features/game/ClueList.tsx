import type { Puzzle, Word } from '@cruzadinha/shared'
import styles from './ClueList.module.css'

type ClueListProps = {
  puzzle: Puzzle
  activeWord: Word | null
  // Palavras já preenchidas, no formato "6across".
  filled: ReadonlySet<string>
  onSelect: (word: Word) => void
}

export function wordKey(word: Word): string {
  return `${word.number}${word.direction}`
}

function Group({
  title,
  words,
  activeWord,
  filled,
  onSelect,
}: { title: string; words: Word[] } & Omit<ClueListProps, 'puzzle'>) {
  return (
    <section aria-label={title} className={styles.group}>
      <h2 className={styles.heading}>{title}</h2>
      <ol className={styles.list}>
        {words.map((word) => {
          const active =
            activeWord?.number === word.number && activeWord.direction === word.direction
          const done = filled.has(wordKey(word))
          return (
            <li key={wordKey(word)}>
              <button
                type="button"
                className={`${styles.clue} ${active ? styles.active : ''} ${done ? styles.done : ''}`}
                aria-current={active ? 'true' : undefined}
                onClick={() => onSelect(word)}
              >
                <b className={styles.number}>{word.number}</b>
                <span>{word.clue}</span>
                {done ? <span className={styles.hidden}>, preenchida</span> : null}
              </button>
            </li>
          )
        })}
      </ol>
    </section>
  )
}

// Horizontais e verticais; clicar numa dica seleciona a palavra no tabuleiro.
export function ClueList({ puzzle, activeWord, filled, onSelect }: ClueListProps) {
  const across = puzzle.words.filter((word) => word.direction === 'across')
  const down = puzzle.words.filter((word) => word.direction === 'down')
  return (
    <div className={styles.lists}>
      <Group
        title="Horizontais"
        words={across}
        activeWord={activeWord}
        filled={filled}
        onSelect={onSelect}
      />
      <Group
        title="Verticais"
        words={down}
        activeWord={activeWord}
        filled={filled}
        onSelect={onSelect}
      />
    </div>
  )
}
