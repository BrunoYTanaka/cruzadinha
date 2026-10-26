import type { Puzzle, Word } from '@cruzadinha/shared'
import { useEffect, useRef } from 'react'
import { wordKey, type StrikeMode } from '../../game-logic/clue-strike'
import styles from './ClueList.module.css'
import { keepSelectionOnDoubleClick } from './useCopyClue'

type ClueListProps = {
  puzzle: Puzzle
  activeWord: Word | null
  // Palavras riscadas, no formato "6across": resolvidas (completas e certas) no modo `solved`,
  // completas no modo `filled` (feature 021).
  struck: ReadonlySet<string>
  strikeMode?: StrikeMode
  onSelect: (word: Word) => void
  // Duplo clique na dica copia o texto (feature 032); sem ele a opção está desligada.
  onCopy?: (word: Word) => void
  // Computador: as listas ocupam a altura do pai e cada grupo rola por dentro, mantendo a dica
  // ativa visível.
  fill?: boolean
}

function Group({
  title,
  words,
  activeWord,
  struck,
  strikeMode = 'solved',
  onSelect,
  onCopy,
}: { title: string; words: Word[] } & Omit<ClueListProps, 'puzzle' | 'fill'>) {
  // Ao preencher, a dica só fica riscada: sem fundo de sucesso e sem visto, porque pode estar errada.
  const solved = strikeMode === 'solved'
  return (
    <section aria-label={title} className={styles.group}>
      <h2 className={styles.heading}>{title}</h2>
      <ol className={styles.list}>
        {words.map((word) => {
          const active =
            activeWord?.number === word.number && activeWord.direction === word.direction
          const marked = struck.has(wordKey(word))
          const mark = marked ? (solved ? styles.done : styles.struck) : ''
          return (
            <li key={wordKey(word)}>
              <button
                type="button"
                className={`${styles.clue} ${active ? styles.active : ''} ${mark}`}
                aria-current={active ? 'true' : undefined}
                onClick={() => onSelect(word)}
                onDoubleClick={onCopy ? () => onCopy(word) : undefined}
                onMouseDown={onCopy ? keepSelectionOnDoubleClick : undefined}
              >
                <b className={styles.number}>{word.number}</b>
                <span>{word.clue}</span>
                {marked && solved ? (
                  <>
                    <span className={styles.hidden}>, resolvida</span>
                    <svg viewBox="0 0 24 24" aria-hidden="true" className={styles.check}>
                      <path d="M5 12.5l4.5 4.5L19 7.5" />
                    </svg>
                  </>
                ) : null}
                {marked && !solved ? <span className={styles.hidden}>, preenchida</span> : null}
              </button>
            </li>
          )
        })}
      </ol>
    </section>
  )
}

// Horizontais e verticais; clicar numa dica seleciona a palavra no tabuleiro.
export function ClueList({
  puzzle,
  activeWord,
  struck,
  strikeMode,
  onSelect,
  onCopy,
  fill = false,
}: ClueListProps) {
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
        struck={struck}
        strikeMode={strikeMode}
        onSelect={onSelect}
        onCopy={onCopy}
      />
      <Group
        title="Verticais"
        words={down}
        activeWord={activeWord}
        struck={struck}
        strikeMode={strikeMode}
        onSelect={onSelect}
        onCopy={onCopy}
      />
    </div>
  )
}
