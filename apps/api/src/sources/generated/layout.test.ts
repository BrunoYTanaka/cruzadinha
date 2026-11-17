import { puzzleSchema, validatePuzzleWithSolution } from '@cruzadinha/shared'
import { describe, expect, it } from 'vitest'
import { SAMPLE_WORDS } from './fixtures'
import { layout, minWords, toPuzzle, type Placement } from './layout'

const options = { source: 'casa', date: '2026-11-17', difficulty: 'medium' } as const

function build(size: number, seed = 42) {
  const placed = layout(SAMPLE_WORDS, size, seed)
  expect(placed).not.toBeNull()
  const result = toPuzzle(placed!, { ...options, size })
  expect(result).not.toBeNull()
  return { placed: placed!, ...result! }
}

describe('layout (feature 064)', () => {
  it.each([9, 11, 15])('monta uma grade %i x %i válida e ligada', (size) => {
    const { placed, puzzle, solution } = build(size)
    expect(placed.length).toBeGreaterThanOrEqual(minWords(size))
    expect(puzzle.grid.width).toBe(size)
    expect(puzzle.grid.height).toBe(size)
    expect(puzzleSchema.safeParse(puzzle).success).toBe(true)
    expect(validatePuzzleWithSolution(puzzle, solution).success).toBe(true)
  })

  it('a mesma semente dá a mesma grade', () => {
    expect(layout(SAMPLE_WORDS, 11, 7)).toEqual(layout(SAMPLE_WORDS, 11, 7))
  })

  it('cada palavra está na solução, letra por letra, com acento', () => {
    const { placed, solution } = build(11)
    for (const p of placed) {
      ;[...p.answer].forEach((letter, i) => {
        const r = p.direction === 'across' ? p.row : p.row + i
        const c = p.direction === 'across' ? p.col + i : p.col
        expect(solution.cells[r]![c]).toBe(letter)
      })
    }
  })

  it('não cruza letras com acento diferente', () => {
    const words = [
      { answer: 'AMOR', clue: 'a' },
      { answer: 'ÁGUA', clue: 'b' },
    ]
    // ÁGUA não tem letra idêntica a AMOR (Á ≠ A); só AMOR cabe, abaixo do mínimo.
    expect(layout(words, 9, 1)).toBeNull()
  })

  it('devolve null com palavras de menos', () => {
    expect(layout(SAMPLE_WORDS.slice(0, 5), 11, 1)).toBeNull()
  })

  it('ignora palavras mais longas que a grade', () => {
    const placed = layout(SAMPLE_WORDS, 9, 3)!
    expect(placed.every((p: Placement) => [...p.answer].length <= 9)).toBe(true)
  })

  it('a atribuição traz só o nome da fonte e a dificuldade', () => {
    const { puzzle } = build(11)
    expect(puzzle.attribution).toEqual({
      sourceName: 'Casa',
      title: 'Dificuldade: Médio',
      author: null,
      copyright: null,
    })
    expect(JSON.stringify(puzzle.attribution)).not.toMatch(/IA|DeepSeek|gerad/i)
  })
})
