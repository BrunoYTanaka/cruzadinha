import { describe, expect, it } from 'vitest'
import { statsSchema } from './schema'

const row = (source: string) => ({ source, total: 1, averageMs: 1000, bestMs: 900 })

describe('statsSchema', () => {
  it('drops a source this site does not know', () => {
    const parsed = statsSchema.parse({
      streak: { current: 1, longest: 2 },
      total: 2,
      averageMs: 1000,
      bySource: [row('oglobo'), row('nova')],
    })
    expect(parsed.bySource.map((item) => item.source)).toEqual(['oglobo'])
  })
})
