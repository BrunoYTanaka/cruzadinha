import { describe, expect, it } from 'vitest'
import { resolveVisibleSources, updateSourcesRequestSchema } from './schema'

const ALL = ['oglobo', 'cruzadaonline', 'cruzadasbrasil', 'clube']

describe('resolveVisibleSources', () => {
  it('returns every source in the default order without rows', () => {
    expect(resolveVisibleSources([])).toEqual(ALL)
  })

  it('orders by position and drops hidden ones', () => {
    const rows = [
      { id: 'oglobo', visible: true, position: 2 },
      { id: 'cruzadaonline', visible: false, position: 0 },
      { id: 'cruzadasbrasil', visible: true, position: 1 },
      { id: 'clube', visible: true, position: 3 },
    ]
    expect(resolveVisibleSources(rows)).toEqual(['cruzadasbrasil', 'oglobo', 'clube'])
  })

  it('appends a source without a row at the end, visible', () => {
    const rows = [
      { id: 'clube', visible: true, position: 0 },
      { id: 'oglobo', visible: true, position: 1 },
    ]
    expect(resolveVisibleSources(rows)).toEqual([
      'clube',
      'oglobo',
      'cruzadaonline',
      'cruzadasbrasil',
    ])
  })

  it('ignores a row of an unknown source', () => {
    expect(resolveVisibleSources([{ id: 'x', visible: true, position: 0 }])).toEqual(ALL)
  })
})

describe('updateSourcesRequestSchema', () => {
  const full = ALL.map((id) => ({ id, visible: true }))

  it('accepts every source once', () => {
    expect(updateSourcesRequestSchema.safeParse({ sources: full }).success).toBe(true)
  })

  it('refuses a repeated, missing or unknown source and extra keys', () => {
    const repeated = [...full.slice(0, 3), full[0]]
    expect(updateSourcesRequestSchema.safeParse({ sources: repeated }).success).toBe(false)
    expect(updateSourcesRequestSchema.safeParse({ sources: full.slice(0, 3) }).success).toBe(false)
    const unknown = [...full.slice(0, 3), { id: 'x', visible: true }]
    expect(updateSourcesRequestSchema.safeParse({ sources: unknown }).success).toBe(false)
    expect(updateSourcesRequestSchema.safeParse({ sources: full, extra: 1 }).success).toBe(false)
  })
})
