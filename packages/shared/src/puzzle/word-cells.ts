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

export type WordBoundary = { row: number; col: number; direction: WordPlacement['direction'] }

// Onde o tabuleiro desenha a barra entre células abertas vizinhas que não pertencem à mesma palavra
// da direção (feature 030): o fim de uma palavra colada na seguinte ou numa corrida de uma letra.
// Numa grade com blocos não há nenhuma. `row`/`col` é a célula que fica antes da barra (à esquerda
// ou acima).
export function wordBoundaries(puzzle: {
  grid: { cells: { kind: 'block' | 'open' }[][] }
  words: WordPlacement[]
}): WordBoundary[] {
  const owner = new Map<string, WordPlacement>()
  for (const word of puzzle.words) {
    for (const cell of wordCells(word)) owner.set(`${word.direction}:${cell.row}:${cell.col}`, word)
  }
  const open = (row: number, col: number) => puzzle.grid.cells[row]?.[col]?.kind === 'open'
  const apart = (direction: WordPlacement['direction'], a: CellPosition, b: CellPosition) => {
    const first = owner.get(`${direction}:${a.row}:${a.col}`)
    const second = owner.get(`${direction}:${b.row}:${b.col}`)
    return (first !== undefined || second !== undefined) && first !== second
  }
  const boundaries: WordBoundary[] = []
  puzzle.grid.cells.forEach((line, row) =>
    line.forEach((_, col) => {
      if (!open(row, col)) return
      if (open(row, col + 1) && apart('across', { row, col }, { row, col: col + 1 })) {
        boundaries.push({ row, col, direction: 'across' })
      }
      if (open(row + 1, col) && apart('down', { row, col }, { row: row + 1, col })) {
        boundaries.push({ row, col, direction: 'down' })
      }
    }),
  )
  return boundaries
}
