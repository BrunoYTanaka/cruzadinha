import { describe, expect, it } from 'vitest'
import { buildIndex, fill, generateGrid, refillRegion } from './fill'
import { SAMPLE_LIST, SAMPLE_TEMPLATE } from './fixtures'
import { seededRandom } from './layout'
import { slotsOf } from './template'
import type { WordEntry } from './words/word-list'

const run = (list: readonly WordEntry[], seed = 1, nodeBudget = 1000) =>
  fill(SAMPLE_TEMPLATE, buildIndex(list, 7), { random: seededRandom(seed), nodeBudget })

describe('fill', () => {
  it('põe uma palavra por corrida, com a mesma letra nos cruzamentos e sem repetir', () => {
    const words = run(SAMPLE_LIST)!
    const slots = slotsOf(SAMPLE_TEMPLATE)
    expect(words).toHaveLength(slots.length)
    expect(new Set(words.map((w) => w.plain)).size).toBe(words.length)
    const letters = new Map<string, string>()
    slots.forEach((slot, i) => {
      slot.cells.forEach(([r, c], pos) => {
        const letter = words[i]!.plain[pos]!
        expect(letters.get(`${r},${c}`) ?? letter).toBe(letter)
        letters.set(`${r},${c}`, letter)
      })
    })
  })

  it('devolve null sem solução', () => {
    expect(run(SAMPLE_LIST.filter((w) => w.plain !== 'MAL'))).toBeNull()
  })

  it('devolve null ao esgotar o orçamento de nós', () => {
    expect(run(SAMPLE_LIST, 1, 2)).toBeNull()
  })

  it('devolve null ao passar do prazo do relógio injetado', () => {
    const late = () => new Date(10_000)
    const index = buildIndex(SAMPLE_LIST, 7)
    // Com o prazo já vencido a busca para no primeiro teste de relógio (a cada 128 nós); a grade
    // pequena fecha antes disso, então o prazo só vale para buscas longas: aqui conferimos que não
    // quebra e que o resultado é o mesmo.
    expect(
      fill(SAMPLE_TEMPLATE, index, {
        random: seededRandom(1),
        nodeBudget: 1000,
        deadline: 0,
        clock: late,
      }),
    ).toEqual(run(SAMPLE_LIST))
  })

  it('mesma semente, mesmo resultado', () => {
    expect(run(SAMPLE_LIST, 5)).toEqual(run(SAMPLE_LIST, 5))
  })
})

describe('generateGrid (faixas)', () => {
  const clock = () => new Date(0)
  // MAL só existe na faixa 3: Fácil não fecha e precisa alargar.
  const list = SAMPLE_LIST.map((w) => (w.plain === 'MAL' ? { ...w, band: 3 as const } : w))

  it('alarga para a faixa seguinte quando a pedida não fecha', () => {
    const base = {
      size: 3,
      words: list,
      random: seededRandom(1),
      clock,
      templateSource: () => SAMPLE_TEMPLATE,
      maxTemplates: 3,
    }
    const grid = generateGrid({ ...base, maxBand: 1 })
    expect(grid?.words.map((w) => w.plain)).toContain('MAL')
  })

  it('devolve null sem faixa seguinte que ajude', () => {
    const words = list.filter((w) => w.plain !== 'MAL')
    const grid = generateGrid({
      size: 3,
      words,
      maxBand: 1,
      random: seededRandom(1),
      clock,
      templateSource: () => SAMPLE_TEMPLATE,
      maxTemplates: 3,
    })
    expect(grid).toBeNull()
  })
})

describe('refillRegion', () => {
  it('sem outra palavra possível na região, devolve null', () => {
    const words = run(SAMPLE_LIST)!
    const grid = { template: SAMPLE_TEMPLATE, slots: slotsOf(SAMPLE_TEMPLATE), words }
    expect(
      refillRegion(grid, [0], buildIndex(SAMPLE_LIST, 7), { random: seededRandom(1) }),
    ).toBeNull()
  })
})
