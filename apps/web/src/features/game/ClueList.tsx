import type { Puzzle, Word } from '@cruzadinha/shared'
import { useEffect, useRef } from 'react'
import styles from './ClueList.module.css'

type ClueListProps = {
  puzzle: Puzzle
  activeWord: Word | null
  // Palavras já preenchidas, no formato "6across".
  filled: ReadonlySet<string>
  onSelect: (word: Word) => void
  // Computador: as listas ocupam a altura do pai e cada grupo rola por dentro, mantendo a dica
  // ativa visível.
  fill?: boolean
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
}: { title: string; words: Word[] } & Omit<ClueListProps, 'puzzle' | 'fill'>) {
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
export function ClueList({ puzzle, activeWord, filled, onSelect, fill = false }: ClueListProps) {
  const across = puzzle.words.filter((word) => word.direction === 'across')
  const down = puzzle.words.filter((word) => word.direction === 'down')
  const listsRef = useRef<HTMLDivElement>(null)
  const activeKey = activeWord ? wordKey(activeWord) : null

  // Rola só o grupo da dica ativa: `scrollIntoView` também rolaria a página. O título do grupo fica
  // fixo no topo, então a área visível começa abaixo dele.
  useEffect(() => {
    if (!fill || activeKey === null) return
    const button = listsRef.current?.querySelector<HTMLElement>('[aria-current="true"]')
    const group = button?.closest<HTMLElement>('section')
    if (!button || !group) return
    const area = group.getBoundingClientRect()
    const heading = group.querySelector('h2')
    const top = heading
      ? heading.getBoundingClientRect().bottom +
        (Number.parseFloat(getComputedStyle(heading).marginBottom) || 0)
      : area.top
    const item = button.getBoundingClientRect()
    if (item.top < top) group.scrollTop -= top - item.top
    else if (item.bottom > area.bottom) group.scrollTop += item.bottom - area.bottom
  }, [fill, activeKey])

  return (
    <div ref={listsRef} className={`${styles.lists} ${fill ? styles.fill : ''}`}>
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
