import { describe, expect, it } from 'vitest'
import { convertCruzadasBrasil } from './convert'
import { readFixture } from './fixtures'
import { readPageData } from './page-data'

function convert(name: string, date = '2026-10-16') {
  const read = readPageData(readFixture(name))
  if (!read.ok) throw new Error(`fixture ${name}: ${read.detail}`)
  return convertCruzadasBrasil(read.data, 'daily', date)
}

describe('convertCruzadasBrasil', () => {
  it('reproduz grade, números, palavras, dicas e letras da fixture válida', () => {
    const result = convert('daily-valid.html')
    expect(result.ok).toBe(true)
    if (!result.ok) return
    const { puzzle, solution } = result

    expect(puzzle).toMatchObject({ source: 'cruzadasbrasil', level: 'daily', date: '2026-10-16' })
    expect(puzzle.attribution).toEqual({
      sourceName: 'Cruzadas Brasil',
      title: 'Palavras Cruzadas de 16/10/2026',
      author: null,
      copyright: null,
    })
    expect(puzzle.grid.width).toBe(5)
    expect(puzzle.grid.height).toBe(5)
    expect(
      puzzle.grid.cells[0]!.map((c) => (c.kind === 'block' ? '#' : (c.number ?? '.'))),
    ).toEqual([1, '.', '.', 2, '#'])
    expect(puzzle.grid.cells[3]![0]).toEqual({ kind: 'open', number: 3 })
    expect(puzzle.words).toEqual([
      {
        number: 1,
        direction: 'across',
        row: 0,
        col: 0,
        length: 4,
        clue: 'Ato, em português & em "ação"',
      },
      { number: 3, direction: 'across', row: 3, col: 0, length: 4, clue: 'Roedor de esgoto' },
      { number: 1, direction: 'down', row: 0, col: 0, length: 4, clue: 'Sentimento forte' },
      { number: 2, direction: 'down', row: 0, col: 3, length: 4, clue: 'Órgão da visão' },
    ])
    expect(solution.cells[0]).toEqual(['A', 'Ç', 'Ã', 'O', null])
    expect(solution.cells[4]).toEqual([null, null, null, null, null])
  })

  it.each([
    ['clue-without-word.html', 'unexpected-format'],
    ['word-without-clue.html', 'unexpected-format'],
    ['numbers-mismatch.html', 'unexpected-format'],
    ['positions-mismatch.html', 'unexpected-format'],
    ['grid-solution-mismatch.html', 'unexpected-format'],
    ['dimensions-mismatch.html', 'unexpected-format'],
    ['changed-shape.html', 'unexpected-format'],
    ['other-level.html', 'unsupported'],
    ['other-date.html', 'unexpected-format'],
  ])('%s dá o motivo %s, sem puzzle parcial', (name, reason) => {
    const result = convert(name)
    expect(result).toMatchObject({ ok: false, reason })
    expect(result).not.toHaveProperty('puzzle')
  })

  it('o detalhe nunca leva letras nem texto de dica', () => {
    for (const name of [
      'clue-without-word.html',
      'word-without-clue.html',
      'numbers-mismatch.html',
    ]) {
      const result = convert(name)
      const detail = result.ok ? '' : (result.detail ?? '')
      expect(detail).not.toMatch(/Sentimento|Roedor|Órgão|AÇÃO/)
    }
  })

  it('recusa data pedida diferente do id e dado que não é objeto', () => {
    expect(convert('daily-valid.html', '2026-10-15')).toMatchObject({ ok: false })
    expect(convertCruzadasBrasil(null, 'daily', '2026-10-16')).toMatchObject({
      ok: false,
      reason: 'unexpected-format',
    })
  })
})
