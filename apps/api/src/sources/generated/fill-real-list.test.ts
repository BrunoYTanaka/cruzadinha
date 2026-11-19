import { describe, expect, it } from 'vitest'
import { buildIndex, generateGrid, refillRegion } from './fill'
import { seededRandom } from './layout'
import { loadWordList } from './words/word-list'

describe('generateGrid com a lista real', () => {
  it('fecha uma grade 9 x 9 só com o orçamento de nós, sem relógio real', async () => {
    const grid = generateGrid({
      size: 9,
      words: await loadWordList(),
      maxBand: 3,
      random: seededRandom(2026),
      clock: () => new Date(0),
      maxTemplates: 200,
    })
    expect(grid).not.toBeNull()
    expect(new Set(grid!.words.map((w) => w.plain)).size).toBe(grid!.words.length)
  })

  it('reparo local troca a palavra recusada e mantém o resto da grade', async () => {
    const words = await loadWordList()
    const grid = generateGrid({
      size: 11,
      words,
      maxBand: 3,
      random: seededRandom(7),
      clock: () => new Date(0),
      maxTemplates: 200,
    })!
    const swapped = refillRegion(grid, [0], buildIndex(words, 7), { random: seededRandom(1) })
    expect(swapped).not.toBeNull()
    expect(swapped!.map((w) => w.plain)).not.toContain(grid.words[0]!.plain)
    const changed = swapped!.filter((w, i) => w.plain !== grid.words[i]!.plain).length
    expect(changed).toBeLessThan(grid.words.length / 2)
    expect(new Set(swapped!.map((w) => w.plain)).size).toBe(swapped!.length)
    // Cruzamentos coerentes.
    const letters = new Map<string, string>()
    grid.slots.forEach((slot, i) => {
      slot.cells.forEach(([r, c], pos) => {
        const letter = swapped![i]!.plain[pos]!
        expect(letters.get(`${r},${c}`) ?? letter).toBe(letter)
        letters.set(`${r},${c}`, letter)
      })
    })
  })
})
