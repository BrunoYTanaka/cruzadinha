import { describe, expect, it } from 'vitest'
import { decideSources, type SourceRequestItem, type SourceSetting } from './sources.rules'

const request = (visible: boolean[]): SourceRequestItem[] => [
  { id: 'oglobo', visible: visible[0] ?? true },
  { id: 'cruzadaonline', visible: visible[1] ?? true },
  { id: 'cruzadasbrasil', visible: visible[2] ?? true },
  { id: 'clube', visible: visible[3] ?? true },
]
const current: SourceSetting[] = request([]).map((item, position) => ({ ...item, position }))

describe('decideSources', () => {
  it('turns the order into positions', () => {
    const reversed = [...request([])].reverse()
    expect(decideSources(current, reversed)).toEqual({
      kind: 'save',
      rows: reversed.map((item, position) => ({ ...item, position })),
    })
  })

  it('refuses to hide the last visible source', () => {
    expect(decideSources(current, request([false, false, false, false]))).toEqual({
      kind: 'no-visible-source',
    })
  })

  it('refuses an incomplete or repeated list', () => {
    expect(decideSources(current, request([]).slice(0, 3))).toEqual({ kind: 'invalid' })
    const repeated = [...request([]).slice(0, 3), { id: 'oglobo' as const, visible: true }]
    expect(decideSources(current, repeated)).toEqual({ kind: 'invalid' })
  })

  it('reports unchanged when equal to the current state', () => {
    expect(decideSources(current, request([]))).toEqual({ kind: 'unchanged' })
  })

  it('saves when there is no current row (default state) but something differs', () => {
    expect(decideSources([], request([true, false])).kind).toBe('save')
  })
})
