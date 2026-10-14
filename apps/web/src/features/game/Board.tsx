import type { Puzzle } from '@cruzadinha/shared'
import { useEffect, useMemo, useRef, type KeyboardEvent, type MouseEvent } from 'react'
import type { Arrow, PuzzleIndex } from '../../game-logic/navigation'
import { activeWord } from '../../game-logic/navigation'
import { cellKey, type GameState, type Position } from '../../game-logic/state'
import styles from './Board.module.css'
import { Cell } from './Cell'

export type BoardKey =
  | { type: 'letter'; key: string }
  | { type: 'backspace' }
  | { type: 'arrow'; arrow: Arrow }
  | { type: 'nextWord' }
  | { type: 'previousWord' }

type BoardProps = {
  id?: string
  puzzle: Puzzle
  index: PuzzleIndex
  state: GameState
  onSelect: (position: Position) => void
  onKey: (key: BoardKey) => void
  // Em modo leitura não há seleção nem teclado.
  readOnly?: boolean
  // Dá o foco ao tabuleiro quando monta (o jogo abre pronto para digitar).
  focusOnMount?: boolean
}

function cellId(row: number, col: number): string {
  return `cell-${row}-${col}`
}

function describe(
  row: number,
  col: number,
  letter: string | null,
  mark: GameState['marks'][string] | undefined,
): string {
  const base = `Linha ${row + 1}, coluna ${col + 1}, ${letter ? `letra ${letter}` : 'vazia'}`
  if (mark === 'helped') return `${base}, com ajuda`
  if (mark === 'wrong') return `${base}, errada na verificação`
  return base
}

const ARROWS: readonly string[] = ['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight']

export function Board({
  puzzle,
  index,
  state,
  onSelect,
  onKey,
  id,
  readOnly = false,
  focusOnMount,
}: BoardProps) {
  const { width, height } = puzzle.grid
  const word = activeWord(index, state.selected, state.direction)
  const inWord = useMemo(
    () => new Set(word ? index.cellsOf(word).map((cell) => cellKey(cell)) : []),
    [word, index],
  )
  const selectedKey = state.selected ? cellKey(state.selected) : null
  const gridRef = useRef<HTMLDivElement>(null)
  useEffect(() => {
    if (focusOnMount) gridRef.current?.focus()
  }, [focusOnMount])

  function onKeyDown(event: KeyboardEvent<HTMLDivElement>) {
    if (readOnly || event.ctrlKey || event.altKey || event.metaKey) return
    const { key } = event
    if (ARROWS.includes(key)) {
      event.preventDefault()
      onKey({ type: 'arrow', arrow: key as Arrow })
    } else if (key === 'Backspace') {
      event.preventDefault()
      onKey({ type: 'backspace' })
    } else if (key === 'Tab') {
      // Tab anda entre palavras, mas nunca prende o foco: na última palavra (Tab) e na primeira
      // (Shift+Tab) ele segue para fora do tabuleiro.
      const words = index.words
      const current = word
      const at = current
        ? words.findIndex(
            (item) => item.number === current.number && item.direction === current.direction,
          )
        : -1
      const leaving = event.shiftKey ? at <= 0 : at === words.length - 1
      if (leaving) return
      event.preventDefault()
      onKey({ type: event.shiftKey ? 'previousWord' : 'nextWord' })
    } else if (key.length === 1) {
      event.preventDefault()
      onKey({ type: 'letter', key })
    }
  }

  function onClick(event: MouseEvent<HTMLDivElement>) {
    if (readOnly || !(event.target instanceof Element)) return
    const target = event.target.closest<HTMLElement>('[data-row]')
    if (!target) return
    onSelect({ row: Number(target.dataset.row), col: Number(target.dataset.col) })
    event.currentTarget.focus()
  }

  return (
    // O tabuleiro é uma única parada de tabulação: o foco "ativo" é a célula selecionada.
    <div
      id={id}
      ref={gridRef}
      role="grid"
      aria-label={`Palavras cruzadas ${width} por ${height}`}
      aria-readonly={readOnly || undefined}
      aria-activedescendant={
        !readOnly && state.selected ? cellId(state.selected.row, state.selected.col) : undefined
      }
      tabIndex={readOnly ? -1 : 0}
      className={styles.grid}
      style={{ '--cols': width, '--rows': height } as React.CSSProperties}
      onKeyDown={onKeyDown}
      onClick={onClick}
    >
      {puzzle.grid.cells.map((line, row) => (
        <div role="row" key={row} className={styles.row}>
          {line.map((cell, col) => {
            const key = cellKey({ row, col })
            return (
              <Cell
                key={col}
                id={cellId(row, col)}
                row={row}
                col={col}
                open={cell.kind === 'open'}
                number={cell.kind === 'open' ? cell.number : null}
                letter={state.cells[row]?.[col] ?? null}
                selected={!readOnly && selectedKey === key}
                inWord={!readOnly && inWord.has(key)}
                mark={state.marks[key]}
                label={describe(row, col, state.cells[row]?.[col] ?? null, state.marks[key])}
              />
            )
          })}
        </div>
      ))}
    </div>
  )
}
