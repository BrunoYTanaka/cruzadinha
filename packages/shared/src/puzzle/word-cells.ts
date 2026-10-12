export type CellPosition = { row: number; col: number }

export type WordPlacement = {
  direction: 'across' | 'down'
  row: number
  col: number
  length: number
}

export function wordCells(word: WordPlacement): CellPosition[] {
  return Array.from({ length: word.length }, (_, i) =>
    word.direction === 'across'
      ? { row: word.row, col: word.col + i }
      : { row: word.row + i, col: word.col },
  )
}
