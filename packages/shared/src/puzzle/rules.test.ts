import { describe, expect, it } from 'vitest'
import { validatePuzzleWithSolution } from './rules'
import { puzzleSchema, type Puzzle, type Solution } from './schema'
import { wordCells } from './word-cells'

const open = (number: number | null = null) => ({ kind: 'open' as const, number })
const block = { kind: 'block' as const }

// 3 x 3 com bloco central:
// 1 2 3
// 4 # 5
// 6 7 8  (só 1, 3, 4 e 6 iniciam palavras)
function ring(): Puzzle {
  return {
    source: 'oglobo',
    level: 'daily',
    date: '2026-10-12',
    attribution: { sourceName: 'O Globo', title: null, author: null, copyright: null },
    grid: {
      width: 3,
      height: 3,
      cells: [
        [open(1), open(), open(2)],
        [open(), block, open()],
        [open(3), open(), open()],
      ],
    },
    words: [
      { number: 1, direction: 'across', row: 0, col: 0, length: 3, clue: 'Topo' },
      { number: 3, direction: 'across', row: 2, col: 0, length: 3, clue: 'Base' },
      { number: 1, direction: 'down', row: 0, col: 0, length: 3, clue: 'Esquerda' },
      { number: 2, direction: 'down', row: 0, col: 2, length: 3, clue: 'Direita' },
    ],
  }
}

function issuePaths(value: unknown) {
  const result = puzzleSchema.safeParse(value)
  expect(result.success).toBe(false)
  return result.error?.issues.map((issue) => issue.path) ?? []
}

describe('regras do puzzle', () => {
  it('aceita a grade com bloco central', () => {
    expect(puzzleSchema.safeParse(ring()).success).toBe(true)
  })

  it('recusa palavra saindo da grade', () => {
    const puzzle = ring()
    puzzle.words[0] = { ...puzzle.words[0]!, length: 4 }
    expect(issuePaths(puzzle)).toContainEqual(['words', 0])
  })

  it('recusa palavra passando por bloco', () => {
    const puzzle = ring()
    puzzle.grid.cells[1]![0] = open(4)
    puzzle.words.push({ number: 4, direction: 'across', row: 1, col: 0, length: 3, clue: 'Meio' })
    expect(issuePaths(puzzle)).toContainEqual(['words', 4])
  })

  it('recusa tamanho menor que a sequência de células abertas', () => {
    const puzzle = ring()
    puzzle.words[0] = { ...puzzle.words[0]!, length: 2 }
    expect(issuePaths(puzzle)).toContainEqual(['words', 0])
  })

  it('recusa célula inicial sem o número da palavra', () => {
    const puzzle = ring()
    puzzle.grid.cells[2]![0] = open(9)
    expect(issuePaths(puzzle)).toContainEqual(['words', 1])
  })

  it('recusa número repetido na mesma direção', () => {
    const puzzle = ring()
    puzzle.words[1] = { ...puzzle.words[1]!, number: 1 }
    puzzle.grid.cells[2]![0] = open(1)
    expect(issuePaths(puzzle)).toContainEqual(['words', 1])
  })

  it('recusa célula aberta fora de qualquer palavra', () => {
    const puzzle = ring()
    puzzle.words.splice(3, 1)
    puzzle.grid.cells[0]![2] = open()
    expect(issuePaths(puzzle)).toContainEqual(['grid', 'cells', 1, 2])
  })

  it('recusa célula numerada que não inicia palavra', () => {
    const puzzle = ring()
    puzzle.grid.cells[1]![2] = open(7)
    expect(issuePaths(puzzle)).toContainEqual(['grid', 'cells', 1, 2])
  })

  it('recusa dica só com espaços', () => {
    const puzzle = ring()
    puzzle.words[2] = { ...puzzle.words[2]!, clue: '   ' }
    expect(issuePaths(puzzle)).toContainEqual(['words', 2, 'clue'])
  })
})

describe('validatePuzzleWithSolution', () => {
  const solution = (): Solution => ({
    cells: [
      ['A', 'B', 'C'],
      ['D', null, 'E'],
      ['F', 'G', 'H'],
    ],
  })

  it('aceita o par consistente', () => {
    expect(validatePuzzleWithSolution(ring(), solution())).toEqual({ success: true })
  })

  it('recusa dimensões diferentes', () => {
    const result = validatePuzzleWithSolution(ring(), { cells: [['A']] })
    expect(result.success).toBe(false)
  })

  it('recusa letra num bloco', () => {
    const cells = solution().cells
    cells[1]![1] = 'X'
    const result = validatePuzzleWithSolution(ring(), { cells })
    expect(result).toMatchObject({ success: false, issues: [{ path: ['cells', 1, 1] }] })
  })

  it('recusa célula aberta sem letra', () => {
    const cells = solution().cells
    cells[0]![0] = null
    const result = validatePuzzleWithSolution(ring(), { cells })
    expect(result).toMatchObject({ success: false, issues: [{ path: ['cells', 0, 0] }] })
  })

  it('recusa mais de um caractere numa célula', () => {
    const cells = solution().cells
    cells[2]![2] = 'AB'
    const result = validatePuzzleWithSolution(ring(), { cells })
    expect(result).toMatchObject({ success: false, issues: [{ path: ['cells', 2, 2] }] })
  })

  it('aceita letra acentuada', () => {
    const cells = solution().cells
    cells[0]![0] = 'Á'
    expect(validatePuzzleWithSolution(ring(), { cells }).success).toBe(true)
  })
})

describe('wordCells', () => {
  it('devolve as posições na ordem', () => {
    expect(wordCells({ direction: 'across', row: 1, col: 0, length: 3 })).toEqual([
      { row: 1, col: 0 },
      { row: 1, col: 1 },
      { row: 1, col: 2 },
    ])
    expect(wordCells({ direction: 'down', row: 0, col: 2, length: 2 })).toEqual([
      { row: 0, col: 2 },
      { row: 1, col: 2 },
    ])
  })
})
