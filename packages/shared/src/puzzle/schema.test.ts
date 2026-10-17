import { describe, expect, it } from 'vitest'
import {
  availableDateSchema,
  levelSchema,
  puzzleSchema,
  puzzleSourceIdSchema,
  puzzleSourceNames,
  puzzleSourceQuerySchema,
  solutionSchema,
} from './schema'

const example = {
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

describe('puzzleSchema', () => {
  it('aceita o exemplo do contrato', () => {
    expect(puzzleSchema.safeParse(example).success).toBe(true)
  })

  it('recusa data inválida', () => {
    expect(puzzleSchema.safeParse({ ...example, date: '2026-10-32' }).success).toBe(false)
    expect(puzzleSchema.safeParse({ ...example, date: '2026-1-1' }).success).toBe(false)
  })

  it('recusa campo extra no puzzle e na célula', () => {
    expect(puzzleSchema.safeParse({ ...example, solution: [['A']] }).success).toBe(false)
    const cells = structuredClone(example.grid.cells)
    cells[0]![0] = { kind: 'open', number: 1, letter: 'A' } as (typeof cells)[0][0]
    expect(puzzleSchema.safeParse({ ...example, grid: { ...example.grid, cells } }).success).toBe(
      false,
    )
  })

  it('recusa dimensões fora de 1 a 30', () => {
    for (const width of [0, 31]) {
      const result = puzzleSchema.safeParse({ ...example, grid: { ...example.grid, width } })
      expect(result.success).toBe(false)
    }
  })

  it('recusa grade com forma diferente das dimensões', () => {
    const missingRow = { ...example.grid, cells: [example.grid.cells[0]] }
    expect(puzzleSchema.safeParse({ ...example, grid: missingRow }).success).toBe(false)
    const shortRow = {
      ...example.grid,
      cells: [example.grid.cells[0], [{ kind: 'open', number: 3 }]],
    }
    expect(puzzleSchema.safeParse({ ...example, grid: shortRow }).success).toBe(false)
  })
})

describe('levelSchema', () => {
  it('aceita só o nível diário', () => {
    expect(levelSchema.safeParse('daily').success).toBe(true)
    for (const level of ['mini', 'express', 'expert', 'thematic', 'weekly']) {
      expect(levelSchema.safeParse(level).success).toBe(false)
    }
  })
})

describe('puzzleSourceIdSchema', () => {
  it('aceita oglobo e cruzadaonline e recusa outras fontes', () => {
    expect(puzzleSourceIdSchema.safeParse('oglobo').success).toBe(true)
    expect(puzzleSourceIdSchema.safeParse('cruzadaonline').success).toBe(true)
    expect(puzzleSourceIdSchema.safeParse('publico').success).toBe(false)
  })

  it('na consulta, fonte não informada vale oglobo', () => {
    expect(puzzleSourceQuerySchema.parse(undefined)).toBe('oglobo')
    expect(puzzleSourceQuerySchema.parse('cruzadaonline')).toBe('cruzadaonline')
    expect(puzzleSourceQuerySchema.safeParse('xyz').success).toBe(false)
  })

  it('tem um nome exibido para cada fonte', () => {
    expect(Object.keys(puzzleSourceNames).sort()).toEqual([...puzzleSourceIdSchema.options].sort())
    expect(puzzleSourceNames.cruzadaonline).toBe('Cruzada Online')
  })
})

describe('solutionSchema e availableDateSchema', () => {
  it('aceitam valores válidos', () => {
    expect(
      solutionSchema.safeParse({
        cells: [
          ['A', 'B'],
          ['C', 'D'],
        ],
      }).success,
    ).toBe(true)
    expect(availableDateSchema.safeParse({ date: '2026-10-12', inTheFuture: false }).success).toBe(
      true,
    )
  })
})
