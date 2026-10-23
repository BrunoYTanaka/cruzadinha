import { describe, expect, it } from 'vitest'
import { validatePuzzleWithSolution } from './rules'
import { puzzleSchema, type Puzzle, type Solution } from './schema'
import { wordBoundaries, wordCells } from './word-cells'

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

// 4 x 2 sem nenhum bloco; palavras vizinhas coladas na mesma linha (feature 030):
// 1 2 3 4
// 5 . 6 .   horizontais: 1 (AB), 3 (CD), 5 (EF), 6 (GH); verticais: 1 a 4, de duas letras
function neighbours(): Puzzle {
  const across = (number: number, row: number, col: number, clue: string) =>
    ({ number, direction: 'across', row, col, length: 2, clue }) as const
  const down = (number: number, col: number) =>
    ({ number, direction: 'down', row: 0, col, length: 2, clue: `Coluna ${number}` }) as const
  return {
    source: 'clube',
    level: 'daily',
    date: '2026-10-19',
    attribution: { sourceName: 'Cruzadas Clube', title: null, author: null, copyright: null },
    grid: {
      width: 4,
      height: 2,
      cells: [
        [open(1), open(2), open(3), open(4)],
        [open(5), open(), open(6), open()],
      ],
    },
    words: [
      across(1, 0, 0, 'Esquerda do topo'),
      across(3, 0, 2, 'Direita do topo'),
      across(5, 1, 0, 'Esquerda de baixo'),
      across(6, 1, 2, 'Direita de baixo'),
      down(1, 0),
      down(2, 1),
      down(3, 2),
      down(4, 3),
    ],
  }
}

describe('palavras vizinhas na mesma direção', () => {
  it('aceita palavras coladas sem bloco entre elas', () => {
    expect(puzzleSchema.safeParse(neighbours()).success).toBe(true)
  })

  it('recusa palavra seguida de célula aberta que não inicia outra palavra', () => {
    const puzzle = neighbours()
    puzzle.words = puzzle.words.filter(
      (word) => !(word.direction === 'across' && word.number === 3),
    )
    puzzle.grid.cells[0]![2] = open()
    expect(issuePaths(puzzle)).toContainEqual(['words', 0])
  })

  it('recusa lacuna: depois da palavra há duas células soltas', () => {
    const puzzle = loneCell()
    puzzle.words = puzzle.words.filter(
      (word) => !(word.direction === 'across' && word.number === 3),
    )
    expect(issuePaths(puzzle)).toContainEqual(['words', 0])
  })

  it('recusa palavras da mesma direção que se sobrepõem', () => {
    const puzzle = neighbours()
    puzzle.words[1] = { ...puzzle.words[1]!, col: 1, length: 3 }
    expect(issuePaths(puzzle)).toContainEqual(['words', 0])
  })
})

// 5 x 2: uma corrida de uma letra entre barras na linha de cima (a célula do meio só tem palavra
// vertical).
// 1 . 2 . 3      horizontais: 1 (AB), 3 (DE), 4 (FGHIJ); vertical: 2 (CH)
// 4 . . . .
function loneCell(): Puzzle {
  const base = neighbours()
  return {
    ...base,
    grid: {
      width: 5,
      height: 2,
      cells: [
        [open(1), open(), open(2), open(3), open()],
        [open(4), open(), open(), open(), open()],
      ],
    },
    words: [
      { number: 1, direction: 'across', row: 0, col: 0, length: 2, clue: 'a' },
      { number: 3, direction: 'across', row: 0, col: 3, length: 2, clue: 'b' },
      { number: 4, direction: 'across', row: 1, col: 0, length: 5, clue: 'c' },
      { number: 2, direction: 'down', row: 0, col: 2, length: 2, clue: 'd' },
    ],
  }
}

describe('corrida de uma letra entre barras', () => {
  it('aceita a célula sem palavra horizontal entre duas palavras coladas', () => {
    expect(puzzleSchema.safeParse(loneCell()).success).toBe(true)
  })

  it('recusa duas células soltas seguidas depois de uma palavra', () => {
    const puzzle = loneCell()
    puzzle.words = puzzle.words.filter(
      (word) => !(word.direction === 'across' && word.number === 3),
    )
    puzzle.grid.cells[0]![3] = open()
    puzzle.words.push({ number: 5, direction: 'down', row: 0, col: 3, length: 2, clue: 'e' })
    puzzle.words.push({ number: 6, direction: 'down', row: 0, col: 4, length: 2, clue: 'f' })
    puzzle.grid.cells[0]![4] = open(6)
    puzzle.grid.cells[0]![3] = open(5)
    expect(issuePaths(puzzle)).toContainEqual(['words', 0])
  })
})

describe('wordBoundaries', () => {
  it('marca o fim das palavras que têm vizinha colada', () => {
    expect(wordBoundaries(neighbours())).toEqual([
      { row: 0, col: 1, direction: 'across' },
      { row: 1, col: 1, direction: 'across' },
    ])
  })

  it('marca também a corrida de uma letra, dos dois lados', () => {
    const lone = wordBoundaries(loneCell()).filter((b) => b.row === 0)
    expect(lone).toEqual([
      { row: 0, col: 1, direction: 'across' },
      { row: 0, col: 2, direction: 'across' },
    ])
  })

  it('não marca nada numa grade com blocos', () => {
    expect(wordBoundaries(ring())).toEqual([])
  })

  it('marca palavras verticais coladas', () => {
    const grid = { cells: [[open()], [open()], [open()], [open()]] }
    const words: Puzzle['words'] = [
      { number: 1, direction: 'down', row: 0, col: 0, length: 2, clue: 'a' },
      { number: 2, direction: 'down', row: 2, col: 0, length: 2, clue: 'b' },
    ]
    expect(wordBoundaries({ grid, words })).toEqual([{ row: 1, col: 0, direction: 'down' }])
  })
})
