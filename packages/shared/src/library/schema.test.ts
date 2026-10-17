import { describe, expect, it } from 'vitest'
import { LIBRARY_LIMIT, libraryItemSchema, libraryResponseSchema } from './schema'

const ID = '0b9a3a4e-6d0e-4b6c-9a52-1f2e3d4c5b6a'

const notStarted = {
  puzzleId: ID,
  source: 'oglobo',
  date: '2026-10-13',
  level: 'daily',
  status: 'not_started',
  elapsedMs: null,
  finishedMs: null,
  completedAt: null,
  bestMs: null,
  bestAt: null,
}

describe('libraryItemSchema', () => {
  it('aceita um item de cada situação', () => {
    const inProgress = { ...notStarted, status: 'in_progress', elapsedMs: 83_000 }
    const completed = {
      ...notStarted,
      status: 'completed',
      finishedMs: 412_000,
      completedAt: '2026-10-13T14:03:22.000Z',
      bestMs: 398_000,
      bestAt: '2026-10-10T09:12:45.000Z',
    }
    for (const item of [notStarted, inProgress, completed]) {
      expect(libraryItemSchema.safeParse(item).success).toBe(true)
    }
  })

  it('recusa situação desconhecida, nível diferente de daily e data malformada', () => {
    expect(libraryItemSchema.safeParse({ ...notStarted, status: 'abandoned' }).success).toBe(false)
    expect(libraryItemSchema.safeParse({ ...notStarted, level: 'weekly' }).success).toBe(false)
    expect(libraryItemSchema.safeParse({ ...notStarted, date: '13/10/2026' }).success).toBe(false)
  })

  it('descarta campos extras, para o site anterior aceitar versões novas da API (FR-025)', () => {
    const parsed = libraryItemSchema.parse({ ...notStarted, cells: [['A']] })
    expect(parsed).not.toHaveProperty('cells')
    const list = libraryResponseSchema.parse({ items: [notStarted], total: 1 })
    expect(list).toEqual({ items: [notStarted] })
  })

  it('fonte ausente vira oglobo (API anterior) e fonte desconhecida é recusada', () => {
    const withoutSource: Record<string, unknown> = { ...notStarted }
    delete withoutSource.source
    expect(libraryItemSchema.parse(withoutSource).source).toBe('oglobo')
    expect(libraryItemSchema.parse({ ...notStarted, source: 'cruzadaonline' }).source).toBe(
      'cruzadaonline',
    )
    expect(libraryItemSchema.safeParse({ ...notStarted, source: 'xyz' }).success).toBe(false)
  })

  it('exige bestMs e bestAt juntos', () => {
    expect(libraryItemSchema.safeParse({ ...notStarted, bestMs: 1000 }).success).toBe(false)
    expect(
      libraryItemSchema.safeParse({ ...notStarted, bestAt: '2026-10-10T09:12:45.000Z' }).success,
    ).toBe(false)
  })
})

describe('libraryResponseSchema', () => {
  it('aceita lista vazia e lista de itens', () => {
    expect(libraryResponseSchema.safeParse({ items: [] }).success).toBe(true)
    expect(libraryResponseSchema.safeParse({ items: [notStarted] }).success).toBe(true)
  })

  it('recusa corpo sem o envelope', () => {
    expect(libraryResponseSchema.safeParse([notStarted]).success).toBe(false)
  })

  it('expõe o limite de 366 itens', () => {
    expect(LIBRARY_LIMIT).toBe(366)
  })
})
