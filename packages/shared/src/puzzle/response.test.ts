import { describe, expect, it } from 'vitest'
import { puzzleResponseSchema } from './response'

const puzzle = {
  source: 'oglobo',
  level: 'daily',
  date: '2026-10-12',
  attribution: { sourceName: 'O Globo', title: null, author: null, copyright: null },
  grid: {
    width: 2,
    height: 2,
    cells: [
      [
        { kind: 'open', number: 1 },
        { kind: 'open', number: 2 },
      ],
      [
        { kind: 'open', number: 3 },
        { kind: 'open', number: null },
      ],
    ],
  },
  words: [
    { number: 1, direction: 'across', row: 0, col: 0, length: 2, clue: 'Dica 1H' },
    { number: 3, direction: 'across', row: 1, col: 0, length: 2, clue: 'Dica 3H' },
    { number: 1, direction: 'down', row: 0, col: 0, length: 2, clue: 'Dica 1V' },
    { number: 2, direction: 'down', row: 0, col: 1, length: 2, clue: 'Dica 2V' },
  ],
}
const puzzleId = '0b9a3a4e-6d0e-4b6c-9a52-1f2e3d4c5b6a'

const solution = {
  cells: [
    ['A', 'B'],
    ['C', 'D'],
  ],
}

describe('puzzleResponseSchema', () => {
  it('aceita puzzleId, puzzle e solution coerente', () => {
    expect(puzzleResponseSchema.safeParse({ puzzleId, puzzle, solution }).success).toBe(true)
  })

  it('recusa puzzleId que não é uuid', () => {
    expect(puzzleResponseSchema.safeParse({ puzzleId: '123', puzzle, solution }).success).toBe(
      false,
    )
  })

  it('recusa resposta sem solution', () => {
    expect(puzzleResponseSchema.safeParse({ puzzleId, puzzle }).success).toBe(false)
  })

  it('recusa solution com dimensões diferentes da grade', () => {
    const wrong = { cells: [['A', 'B']] }
    expect(puzzleResponseSchema.safeParse({ puzzleId, puzzle, solution: wrong }).success).toBe(
      false,
    )
  })

  it('recusa solution sem letra em célula aberta', () => {
    const missing = {
      cells: [
        ['A', null],
        ['C', 'D'],
      ],
    }
    expect(puzzleResponseSchema.safeParse({ puzzleId, puzzle, solution: missing }).success).toBe(
      false,
    )
  })

  it('recusa campo extra desconhecido', () => {
    const extra = { puzzleId, puzzle, solution, answer: 'x' }
    expect(puzzleResponseSchema.safeParse(extra).success).toBe(false)
  })
})
