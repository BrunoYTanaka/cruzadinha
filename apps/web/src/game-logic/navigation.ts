import { wordCells, type Puzzle, type Word } from '@cruzadinha/shared'
import type { Direction, Position } from './state'

export type Arrow = 'ArrowUp' | 'ArrowDown' | 'ArrowLeft' | 'ArrowRight'

export type PuzzleIndex = {
  puzzle: Puzzle
  // Horizontais por número e depois verticais por número, na ordem do Tab.
  words: Word[]
  isOpen: (position: Position) => boolean
  wordAt: (position: Position, direction: Direction) => Word | null
  cellsOf: (word: Word) => Position[]
}

const key = (row: number, col: number, direction: Direction) => `${direction}:${row},${col}`

export function buildIndex(puzzle: Puzzle): PuzzleIndex {
  const byCell = new Map<string, Word>()
  for (const word of puzzle.words) {
    for (const cell of wordCells(word)) byCell.set(key(cell.row, cell.col, word.direction), word)
  }
  const words = [...puzzle.words].sort((a, b) =>
    a.direction === b.direction ? a.number - b.number : a.direction === 'across' ? -1 : 1,
  )
  return {
    puzzle,
    words,
    isOpen: ({ row, col }) => puzzle.grid.cells[row]?.[col]?.kind === 'open',
    wordAt: ({ row, col }, direction) => byCell.get(key(row, col, direction)) ?? null,
    cellsOf: (word) => wordCells(word),
  }
}

export function otherDirection(direction: Direction): Direction {
  return direction === 'across' ? 'down' : 'across'
}

export function samePosition(a: Position | null, b: Position | null): boolean {
  return a !== null && b !== null && a.row === b.row && a.col === b.col
}

// Mantém a direção se há palavra nela naquela célula; senão usa a outra.
export function directionAt(
  index: PuzzleIndex,
  position: Position,
  preferred: Direction,
): Direction {
  if (index.wordAt(position, preferred)) return preferred
  const other = otherDirection(preferred)
  return index.wordAt(position, other) ? other : preferred
}

export function activeWord(
  index: PuzzleIndex,
  position: Position | null,
  direction: Direction,
): Word | null {
  return position ? index.wordAt(position, direction) : null
}

function indexInWord(index: PuzzleIndex, word: Word, position: Position): number {
  return index.cellsOf(word).findIndex((cell) => samePosition(cell, position))
}

export function nextCellInWord(
  index: PuzzleIndex,
  position: Position,
  direction: Direction,
): Position | null {
  const word = index.wordAt(position, direction)
  if (!word) return null
  return index.cellsOf(word)[indexInWord(index, word, position) + 1] ?? null
}

export function previousCellInWord(
  index: PuzzleIndex,
  position: Position,
  direction: Direction,
): Position | null {
  const word = index.wordAt(position, direction)
  if (!word) return null
  const at = indexInWord(index, word, position)
  return at > 0 ? (index.cellsOf(word)[at - 1] ?? null) : null
}

const STEP: Record<Arrow, { row: number; col: number }> = {
  ArrowUp: { row: -1, col: 0 },
  ArrowDown: { row: 1, col: 0 },
  ArrowLeft: { row: 0, col: -1 },
  ArrowRight: { row: 0, col: 1 },
}

// Vai à célula aberta mais próxima na direção da seta, pulando blocos; no limite não se move.
export function moveBy(index: PuzzleIndex, from: Position, arrow: Arrow): Position | null {
  const step = STEP[arrow]
  let row = from.row + step.row
  let col = from.col + step.col
  const { width, height } = index.puzzle.grid
  while (row >= 0 && col >= 0 && row < height && col < width) {
    if (index.isOpen({ row, col })) return { row, col }
    row += step.row
    col += step.col
  }
  return null
}

export function arrowDirection(arrow: Arrow): Direction {
  return arrow === 'ArrowLeft' || arrow === 'ArrowRight' ? 'across' : 'down'
}

// Onde o cursor cai ao entrar numa palavra: a primeira célula vazia ou, se está cheia, a primeira.
export function entryCell(index: PuzzleIndex, word: Word, letters: (string | null)[][]): Position {
  const cells = index.cellsOf(word)
  const empty = cells.find((cell) => letters[cell.row]?.[cell.col] == null)
  return (empty ?? cells[0]) as Position
}

// Tab (passo 1) e Shift+Tab (passo -1): circular pela lista de palavras.
export function stepWord(index: PuzzleIndex, current: Word | null, step: 1 | -1): Word | null {
  const { words } = index
  if (words.length === 0) return null
  const at = current
    ? words.findIndex(
        (word) => word.number === current.number && word.direction === current.direction,
      )
    : -1
  if (at === -1) return step === 1 ? (words[0] ?? null) : (words[words.length - 1] ?? null)
  return words[(at + step + words.length) % words.length] ?? null
}

export function findWord(index: PuzzleIndex, number: number, direction: Direction): Word | null {
  return index.words.find((word) => word.number === number && word.direction === direction) ?? null
}
