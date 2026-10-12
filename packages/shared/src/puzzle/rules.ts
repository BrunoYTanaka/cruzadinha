import type { Puzzle, Solution } from './schema'
import { wordCells, type CellPosition, type WordPlacement } from './word-cells'

export type RuleIssue = { path: (string | number)[]; message: string }

type RuleCell = { kind: 'block' } | { kind: 'open'; number: number | null }
type RuleGrid = { width: number; height: number; cells: RuleCell[][] }
type RuleWord = WordPlacement & { number: number }

const directionName = { across: 'horizontal', down: 'vertical' } as const

function hasShape(grid: RuleGrid): boolean {
  return grid.cells.length === grid.height && grid.cells.every((row) => row.length === grid.width)
}

function cellAt(grid: RuleGrid, { row, col }: CellPosition): RuleCell | undefined {
  return grid.cells[row]?.[col]
}

function isOpen(grid: RuleGrid, position: CellPosition): boolean {
  return cellAt(grid, position)?.kind === 'open'
}

export function checkGridShape(grid: RuleGrid): RuleIssue[] {
  if (grid.cells.length !== grid.height) {
    return [{ path: ['cells'], message: `a grade deve ter ${grid.height} linhas` }]
  }
  return grid.cells.flatMap((row, r) =>
    row.length === grid.width
      ? []
      : [{ path: ['cells', r], message: `a linha deve ter ${grid.width} células` }],
  )
}

export function checkPuzzleRules(puzzle: { grid: RuleGrid; words: RuleWord[] }): RuleIssue[] {
  const { grid, words } = puzzle
  if (!hasShape(grid)) return []

  const issues: RuleIssue[] = []
  const covered = new Set<string>()
  const starts = new Set<string>()
  const seen = new Set<string>()

  words.forEach((word, i) => {
    const label = `palavra ${word.number} ${directionName[word.direction]}`
    const path = ['words', i]
    const cells = wordCells(word)
    const first = cells[0]
    const last = cells[cells.length - 1]

    const key = `${word.direction}:${word.number}`
    if (seen.has(key)) issues.push({ path, message: `${label} repetida` })
    seen.add(key)

    if (cells.some((cell) => cellAt(grid, cell) === undefined)) {
      issues.push({ path, message: `${label} sai da grade` })
      return
    }
    if (cells.some((cell) => !isOpen(grid, cell))) {
      issues.push({ path, message: `${label} passa por um bloco` })
      return
    }
    if (!first || !last) return

    const step = word.direction === 'across' ? { row: 0, col: 1 } : { row: 1, col: 0 }
    const before = { row: first.row - step.row, col: first.col - step.col }
    const after = { row: last.row + step.row, col: last.col + step.col }
    if (isOpen(grid, before) || isOpen(grid, after)) {
      issues.push({ path, message: `${label} não ocupa a sequência inteira de células abertas` })
    }

    const start = cellAt(grid, first)
    if (start?.kind !== 'open' || start.number !== word.number) {
      issues.push({
        path,
        message: `a célula inicial da ${label} deve ter o número ${word.number}`,
      })
    }

    starts.add(`${first.row}:${first.col}`)
    for (const cell of cells) covered.add(`${cell.row}:${cell.col}`)
  })

  grid.cells.forEach((row, r) =>
    row.forEach((cell, c) => {
      if (cell.kind !== 'open') return
      const path = ['grid', 'cells', r, c]
      if (!covered.has(`${r}:${c}`)) {
        issues.push({ path, message: 'célula aberta fora de qualquer palavra' })
      }
      if (cell.number !== null && !starts.has(`${r}:${c}`)) {
        issues.push({ path, message: `célula com número ${cell.number} não inicia palavra` })
      }
    }),
  )

  return issues
}

export type PairValidation = { success: true } | { success: false; issues: RuleIssue[] }

export function validatePuzzleWithSolution(puzzle: Puzzle, solution: Solution): PairValidation {
  const { grid } = puzzle
  const sameShape =
    solution.cells.length === grid.height &&
    solution.cells.every((row) => row.length === grid.width)
  if (!sameShape) {
    return {
      success: false,
      issues: [{ path: ['cells'], message: 'a solução deve ter as dimensões da grade' }],
    }
  }

  const issues: RuleIssue[] = []
  grid.cells.forEach((row, r) =>
    row.forEach((cell, c) => {
      const letter = solution.cells[r]?.[c]
      const path = ['cells', r, c]
      if (cell.kind === 'block') {
        if (letter !== null) issues.push({ path, message: 'bloco não pode ter letra' })
      } else if (typeof letter !== 'string' || Array.from(letter).length !== 1) {
        issues.push({ path, message: 'célula aberta deve ter exatamente uma letra' })
      } else if (letter !== letter.toLocaleUpperCase('pt-BR')) {
        issues.push({ path, message: 'a letra deve estar em maiúscula' })
      }
    }),
  )

  return issues.length === 0 ? { success: true } : { success: false, issues }
}
