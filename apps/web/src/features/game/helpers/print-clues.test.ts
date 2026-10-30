import { describe, expect, it } from 'vitest'
import { makePuzzle, LAYOUT5 } from '../../../test/fixtures'
import { printClues, printDate } from './print-clues'

describe('printClues', () => {
  const { words } = makePuzzle(LAYOUT5)

  it('separa por direção e ordena por número', () => {
    const { across, down } = printClues([...words].reverse())
    expect(across.every((word) => word.direction === 'across')).toBe(true)
    expect(down.every((word) => word.direction === 'down')).toBe(true)
    expect(across.map((word) => word.number)).toEqual(
      [...across.map((word) => word.number)].sort((a, b) => a - b),
    )
    expect(across.length + down.length).toBe(words.length)
  })

  it('aceita o mesmo número nas duas direções', () => {
    const { across, down } = printClues(words)
    const shared = across.filter((a) => down.some((d) => d.number === a.number))
    expect(shared.length).toBeGreaterThan(0)
  })
})

describe('printDate', () => {
  it('traz dia, mês e ano', () => {
    expect(printDate('2026-10-30')).toBe('30 de outubro de 2026')
  })

  it('não troca o dia perto da virada do UTC', () => {
    expect(printDate('2026-01-01')).toBe('1 de janeiro de 2026')
    expect(printDate('2026-12-31')).toBe('31 de dezembro de 2026')
  })
})
