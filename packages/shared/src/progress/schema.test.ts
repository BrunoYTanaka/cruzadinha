import { describe, expect, it } from 'vitest'
import type { Puzzle } from '../puzzle/schema'
import {
  cellsMatchGrid,
  importProgressRequestSchema,
  progressEnvelopeSchema,
  progressSchema,
  saveProgressRequestSchema,
} from './schema'

const grid: Puzzle['grid'] = {
  width: 2,
  height: 2,
  cells: [
    [{ kind: 'open', number: 1 }, { kind: 'block' }],
    [
      { kind: 'open', number: 2 },
      { kind: 'open', number: null },
    ],
  ],
}

const request = {
  cells: [
    ['A', null],
    [null, 'D'],
  ],
  elapsedMs: 83_000,
  status: 'in_progress',
  savedAt: '2026-10-13T14:03:22.000Z',
}

const puzzleId = '0b9a3a4e-6d0e-4b6c-9a52-1f2e3d4c5b6a'

describe('saveProgressRequestSchema', () => {
  it('aceita um salvamento parcial', () => {
    expect(saveProgressRequestSchema.safeParse(request).success).toBe(true)
  })

  it('aceita savedAt com fuso explícito', () => {
    expect(
      saveProgressRequestSchema.safeParse({ ...request, savedAt: '2026-10-13T11:03:22-03:00' })
        .success,
    ).toBe(true)
  })

  it.each([-1, 1.5, 604_800_001])('recusa elapsedMs %s', (elapsedMs) => {
    expect(saveProgressRequestSchema.safeParse({ ...request, elapsedMs }).success).toBe(false)
  })

  it('aceita os limites de elapsedMs', () => {
    expect(saveProgressRequestSchema.safeParse({ ...request, elapsedMs: 0 }).success).toBe(true)
    expect(
      saveProgressRequestSchema.safeParse({ ...request, elapsedMs: 604_800_000 }).success,
    ).toBe(true)
  })

  it('recusa status desconhecido', () => {
    expect(saveProgressRequestSchema.safeParse({ ...request, status: 'done' }).success).toBe(false)
  })

  it.each(['ontem', '2026-10-13', '2026-10-13T14:03:22'])('recusa savedAt %s', (savedAt) => {
    expect(saveProgressRequestSchema.safeParse({ ...request, savedAt }).success).toBe(false)
  })

  it('recusa campo extra, como userId', () => {
    expect(saveProgressRequestSchema.safeParse({ ...request, userId: puzzleId }).success).toBe(
      false,
    )
  })
})

describe('progressSchema', () => {
  const inProgress = {
    puzzleId,
    cells: request.cells,
    elapsedMs: 83_000,
    status: 'in_progress',
    savedAt: '2026-10-13T14:03:22.000Z',
    completedAt: null,
    finishedMs: null,
    bestMs: null,
    bestAt: null,
    updatedAt: '2026-10-13T14:03:23.000Z',
  }

  it('aceita progresso em andamento', () => {
    expect(progressSchema.safeParse(inProgress).success).toBe(true)
  })

  it('aceita progresso concluído com recorde', () => {
    expect(
      progressSchema.safeParse({
        ...inProgress,
        status: 'completed',
        completedAt: '2026-10-13T14:03:23.412Z',
        finishedMs: 83_000,
        bestMs: 79_000,
        bestAt: '2026-10-12T09:15:40.000Z',
      }).success,
    ).toBe(true)
  })

  it('descarta campo extra da resposta (FR-025)', () => {
    const parsed = progressSchema.parse({ ...inProgress, userId: puzzleId })
    expect(parsed).not.toHaveProperty('userId')
  })
})

describe('progressEnvelopeSchema', () => {
  it('aceita { progress: null }', () => {
    expect(progressEnvelopeSchema.safeParse({ progress: null }).success).toBe(true)
  })

  it('recusa corpo sem a chave progress', () => {
    expect(progressEnvelopeSchema.safeParse({}).success).toBe(false)
  })

  it('descarta campo extra do envelope (FR-025)', () => {
    expect(progressEnvelopeSchema.parse({ progress: null, extra: 1 })).toEqual({ progress: null })
  })
})

describe('cellsMatchGrid', () => {
  it('aceita células vazias e letras maiúsculas nas células abertas', () => {
    expect(cellsMatchGrid(grid, request.cells)).toEqual({ success: true })
    expect(
      cellsMatchGrid(grid, [
        [null, null],
        [null, null],
      ]),
    ).toEqual({ success: true })
  })

  it('aceita letra com acento maiúscula', () => {
    expect(
      cellsMatchGrid(grid, [
        ['Ç', null],
        [null, 'Ã'],
      ]),
    ).toEqual({ success: true })
  })

  it.each([
    [
      'linha a mais',
      [
        ['A', null],
        [null, 'D'],
        [null, null],
      ],
    ],
    ['linha a menos', [['A', null]]],
    [
      'coluna a mais',
      [
        ['A', null, null],
        [null, 'D', null],
      ],
    ],
    [
      'bloco com letra',
      [
        ['A', 'B'],
        [null, 'D'],
      ],
    ],
    [
      'duas letras',
      [
        ['AB', null],
        [null, 'D'],
      ],
    ],
    [
      'minúscula',
      [
        ['a', null],
        [null, 'D'],
      ],
    ],
    [
      'número',
      [
        ['1', null],
        [null, 'D'],
      ],
    ],
    [
      'texto vazio',
      [
        ['', null],
        [null, 'D'],
      ],
    ],
  ])('recusa %s', (_name, cells) => {
    expect(cellsMatchGrid(grid, cells).success).toBe(false)
  })

  it('não repete o conteúdo das letras nas mensagens', () => {
    const result = cellsMatchGrid(grid, [
      ['xyz', null],
      [null, 'D'],
    ])
    expect(JSON.stringify(result)).not.toContain('xyz')
  })
})

describe('importProgressRequestSchema', () => {
  const item = {
    puzzleId,
    cells: request.cells,
    elapsedMs: 1000,
    status: 'in_progress',
    savedAt: request.savedAt,
    completedAt: null,
    finishedMs: null,
    bestMs: null,
    bestAt: null,
  }
  const done = {
    ...item,
    status: 'completed',
    completedAt: '2026-10-13T14:05:00.000Z',
    finishedMs: 1000,
  }
  const ok = (items: unknown[]) => importProgressRequestSchema.safeParse({ items }).success

  it('aceita itens em andamento e concluídos', () => {
    expect(ok([item])).toBe(true)
    expect(ok([done])).toBe(true)
  })

  it.each([
    ['campo help', { ...item, help: {} }],
    ['campo userId', { ...item, userId: puzzleId }],
    ['concluído sem completedAt', { ...done, completedAt: null }],
    ['em andamento com finishedMs', { ...item, finishedMs: 5 }],
    ['bestMs sem bestAt', { ...item, bestMs: 5 }],
  ])('recusa %s', (_name, value) => {
    expect(ok([value])).toBe(false)
  })

  it('recusa lista vazia, mais de 100 itens e puzzleId repetido', () => {
    expect(ok([])).toBe(false)
    const many = Array.from({ length: 101 }, (_, i) => ({
      ...item,
      puzzleId: `0b9a3a4e-6d0e-4b6c-9a52-${String(i).padStart(12, '0')}`,
    }))
    expect(ok(many)).toBe(false)
    expect(ok(many.slice(0, 100))).toBe(true)
    expect(ok([item, item])).toBe(false)
  })
})
