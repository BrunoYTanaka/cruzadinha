import { describe, expect, it } from 'vitest'
import { seededRandom } from './layout'
import { makeTemplate, slotsOf } from './template'

describe('makeTemplate', () => {
  it.each([9, 10, 11, 12, 13, 14, 15])('desenho de lado %i é simétrico e válido', (size) => {
    for (let seed = 1; seed <= 20; seed++) {
      const t = makeTemplate(size, seededRandom(seed), { maxSlot: 7 })
      expect(t).not.toBeNull()
      const { black } = t!
      let blacks = 0
      for (let r = 0; r < size; r++) {
        for (let c = 0; c < size; c++) {
          expect(black[r]![c]).toBe(black[size - 1 - r]![size - 1 - c])
          if (black[r]![c]) blacks++
        }
      }
      expect(blacks).toBeLessThanOrEqual(size * size * 0.25)
      const slots = slotsOf(t!)
      for (const slot of slots) {
        expect(slot.length).toBeGreaterThanOrEqual(3)
        expect(slot.length).toBeLessThanOrEqual(7)
      }
      // Toda casa branca está em exatamente uma corrida de cada direção.
      const seen = new Map<string, number>()
      for (const slot of slots) {
        for (const [r, c] of slot.cells) {
          const key = `${slot.direction}:${r}:${c}`
          seen.set(key, (seen.get(key) ?? 0) + 1)
        }
      }
      expect(seen.size).toBe(2 * (size * size - blacks))
      expect([...seen.values()].every((n) => n === 1)).toBe(true)
      // Brancas ligadas.
      const start = black.flatMap((row, r) => row.map((b, c) => (b ? null : [r, c]))).find(Boolean)!
      const stack = [start as number[]]
      const reached = new Set<string>([start.join()])
      while (stack.length > 0) {
        const [r, c] = stack.pop()!
        for (const [dr, dc] of [
          [1, 0],
          [-1, 0],
          [0, 1],
          [0, -1],
        ] as const) {
          const nr = r! + dr
          const nc = c! + dc
          if (black[nr]?.[nc] === false && !reached.has(`${nr},${nc}`)) {
            reached.add(`${nr},${nc}`)
            stack.push([nr, nc])
          }
        }
      }
      expect(reached.size).toBe(size * size - blacks)
    }
  })

  it('mesma semente, mesma grade', () => {
    const a = makeTemplate(11, seededRandom(7), { maxSlot: 7 })
    const b = makeTemplate(11, seededRandom(7), { maxSlot: 7 })
    expect(a).toEqual(b)
  })
})
