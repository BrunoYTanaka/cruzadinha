import { puzzleSchema, validatePuzzleWithSolution } from '@cruzadinha/shared'
import { describe, expect, it } from 'vitest'
import { fill, buildIndex } from './fill'
import { SAMPLE_LIST, SAMPLE_TEMPLATE } from './fixtures'
import { seededRandom, toPuzzle } from './layout'
import { slotsOf } from './template'

const options = { source: 'casa', date: '2026-11-17', difficulty: 'medium' } as const

const filled = () => {
  const words = fill(SAMPLE_TEMPLATE, buildIndex(SAMPLE_LIST, 7), {
    random: seededRandom(1),
    nodeBudget: 1000,
  })!
  return { template: SAMPLE_TEMPLATE, slots: slotsOf(SAMPLE_TEMPLATE), words }
}

describe('toPuzzle (feature 065)', () => {
  it('converte a grade preenchida em puzzle e solução válidos', () => {
    const grid = filled()
    const built = toPuzzle(
      grid,
      grid.words.map((_, i) => `Dica ${i + 1}`),
      options,
    )!
    expect(puzzleSchema.safeParse(built.puzzle).success).toBe(true)
    expect(validatePuzzleWithSolution(built.puzzle, built.solution).success).toBe(true)
    expect(built.puzzle.grid.width).toBe(3)
  })

  it('numera em ordem de leitura e põe horizontais antes das verticais', () => {
    const grid = filled()
    const { puzzle } = toPuzzle(
      grid,
      grid.words.map((_, i) => `Dica ${i + 1}`),
      options,
    )!
    expect(puzzle.words.map((w) => `${w.direction[0]}${w.number}`)).toEqual([
      'a1',
      'a4',
      'a5',
      'd1',
      'd2',
      'd3',
    ])
  })

  it('cada resposta está na solução, letra por letra, sem acento', () => {
    const grid = filled()
    const { solution } = toPuzzle(
      grid,
      grid.words.map(() => 'Dica'),
      options,
    )!
    grid.slots.forEach((slot, i) => {
      slot.cells.forEach(([r, c], pos) => {
        expect(solution.cells[r]![c]).toBe(grid.words[i]!.plain[pos])
      })
    })
  })

  it('a atribuição traz só o nome da fonte e a dificuldade', () => {
    const grid = filled()
    const { puzzle } = toPuzzle(
      grid,
      grid.words.map(() => 'Dica'),
      options,
    )!
    expect(puzzle.attribution).toEqual({
      sourceName: 'Casa',
      title: 'Dificuldade: Médio',
      author: null,
      copyright: null,
    })
    expect(JSON.stringify(puzzle.attribution)).not.toMatch(/IA|DeepSeek|gerad/i)
  })
})
