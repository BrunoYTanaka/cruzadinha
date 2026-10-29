import { puzzleSchema, solutionSchema } from '@cruzadinha/shared'
import { describe, expect, it } from 'vitest'
import { SAMPLE_PUZZLE, SAMPLE_SOLUTION } from './sample'

describe('amostra da mini cruzada', () => {
  it('é uma cruzada 5x5 válida no formato interno', () => {
    expect(puzzleSchema.safeParse(SAMPLE_PUZZLE).success).toBe(true)
    expect(solutionSchema.safeParse(SAMPLE_SOLUTION).success).toBe(true)
    expect(SAMPLE_PUZZLE.grid.width).toBe(5)
    expect(SAMPLE_PUZZLE.grid.height).toBe(5)
  })

  it('a solução tem letra em toda casa aberta e nada nos blocos', () => {
    SAMPLE_PUZZLE.grid.cells.forEach((line, row) =>
      line.forEach((cell, col) => {
        const letter = SAMPLE_SOLUTION.cells[row]?.[col]
        if (cell.kind === 'block') expect(letter).toBeNull()
        else expect(letter).toMatch(/^[A-Z]$/)
      }),
    )
  })

  it('toda dica tem texto e as palavras cabem na solução', () => {
    for (const word of SAMPLE_PUZZLE.words) {
      expect(word.clue.trim().length).toBeGreaterThan(0)
      const letters = Array.from({ length: word.length }, (_, i) =>
        word.direction === 'across'
          ? SAMPLE_SOLUTION.cells[word.row]?.[word.col + i]
          : SAMPLE_SOLUTION.cells[word.row + i]?.[word.col],
      )
      expect(letters.every((letter) => typeof letter === 'string')).toBe(true)
    }
  })

  it('as seis respostas são as do mockup', () => {
    const answers = SAMPLE_PUZZLE.words.map((word) =>
      Array.from({ length: word.length }, (_, i) =>
        word.direction === 'across'
          ? SAMPLE_SOLUTION.cells[word.row]?.[word.col + i]
          : SAMPLE_SOLUTION.cells[word.row + i]?.[word.col],
      ).join(''),
    )
    expect(answers).toEqual(['COSTA', 'MUNDO', 'OCASO', 'CAMPO', 'SONDA', 'ATOMO'])
  })
})
