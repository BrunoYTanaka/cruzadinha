import { describe, expect, it } from 'vitest'
import { agilmenteResponseSchema, type AgilmenteResponse } from './agilmente-schema'
import { convertAgilmenteResponse } from './convert'
import changedShape from './fixtures/changed-shape.json'
import dailyValid from './fixtures/daily-valid.json'
import unsupportedCellStyle from './fixtures/unsupported-cell-style.json'
import unsupportedRebus from './fixtures/unsupported-rebus.json'

function parse(body: unknown): AgilmenteResponse {
  return agilmenteResponseSchema.parse(body)
}

function valid(): AgilmenteResponse {
  return parse(structuredClone(dailyValid))
}

function convert(body: AgilmenteResponse) {
  return convertAgilmenteResponse(body, 'daily', '2026-10-12')
}

describe('convertAgilmenteResponse com a fixture válida', () => {
  const result = convert(valid())

  it('converte grade, palavras, dicas e letras (SC-001)', () => {
    expect(result.ok).toBe(true)
    if (!result.ok) return
    const { puzzle, solution, dates } = result

    expect(puzzle).toMatchObject({ source: 'oglobo', level: 'daily', date: '2026-10-12' })
    expect(puzzle.attribution).toEqual({
      sourceName: 'O Globo',
      title: 'Cruzada de teste',
      author: 'Autor fictício',
      copyright: 'Fixture reduzida, conteúdo inventado',
    })
    expect(puzzle.grid.width).toBe(5)
    expect(puzzle.grid.height).toBe(5)
    expect(puzzle.grid.cells[0]).toEqual([
      { kind: 'open', number: 1 },
      { kind: 'open', number: null },
      { kind: 'open', number: 2 },
      { kind: 'open', number: null },
      { kind: 'block' },
    ])
    expect(puzzle.words).toEqual([
      {
        number: 1,
        direction: 'across',
        row: 0,
        col: 0,
        length: 4,
        clue: 'Dica inventada 1 horizontal',
      },
      {
        number: 4,
        direction: 'across',
        row: 2,
        col: 0,
        length: 5,
        clue: 'Ação de <i>teste</i> &amp; mais',
      },
      {
        number: 5,
        direction: 'across',
        row: 4,
        col: 1,
        length: 4,
        clue: 'Dica inventada 5 horizontal',
      },
      {
        number: 1,
        direction: 'down',
        row: 0,
        col: 0,
        length: 4,
        clue: 'Dica inventada 1 vertical',
      },
      {
        number: 2,
        direction: 'down',
        row: 0,
        col: 2,
        length: 5,
        clue: 'Dica inventada 2 vertical',
      },
      {
        number: 3,
        direction: 'down',
        row: 1,
        col: 4,
        length: 4,
        clue: 'Dica inventada 3 vertical',
      },
    ])
    expect(solution.cells[0]).toEqual(['A', 'B', 'C', 'D', null])
    expect(solution.cells[4]).toEqual([null, 'P', 'Q', 'R', 'S'])
    expect(dates).toEqual([
      { date: '2026-10-11', inTheFuture: false },
      { date: '2026-10-12', inTheFuture: false },
      { date: '2026-10-13', inTheFuture: true },
    ])
  })

  it('não muda a parte pública quando as letras mudam (SC-004)', () => {
    const body = valid()
    body.ipuzData.solution = body.ipuzData.solution.map((row) =>
      row.map((letter) => (letter === '#' ? letter : 'Z')),
    )
    const other = convert(body)
    expect(other.ok && result.ok && other.puzzle).toEqual(result.ok && result.puzzle)
  })
})

describe('convertAgilmenteResponse recusa', () => {
  type Case = [string, (body: AgilmenteResponse) => void, 'unexpected-format' | 'unsupported']
  const cases: Case[] = [
    ['kind diferente', (b) => (b.ipuzData.kind = ['http://ipuz.org/sudoku#1']), 'unsupported'],
    ['linha a menos', (b) => b.ipuzData.puzzle.pop(), 'unexpected-format'],
    ['célula nula', (b) => (b.ipuzData.puzzle[2]![2] = null), 'unsupported'],
    ['sequência sem número', (b) => (b.ipuzData.puzzle[2]![0] = ':'), 'unexpected-format'],
    ['dica sem palavra', (b) => b.ipuzData.clues.Across.push([9, 'Sobra']), 'unexpected-format'],
    ['palavra sem dica', (b) => b.ipuzData.clues.Down.pop(), 'unexpected-format'],
    ['dica vazia', (b) => (b.ipuzData.clues.Across[0] = [1, '  ']), 'unexpected-format'],
    ['dica como texto', (b) => (b.ipuzData.clues.Across[0] = '1 Dica'), 'unsupported'],
    ['letra vazia', (b) => (b.ipuzData.solution[0]![1] = ''), 'unexpected-format'],
  ]

  it.each(cases)('%s', (_, change, reason) => {
    const body = valid()
    change(body)
    expect(convert(body)).toMatchObject({ ok: false, reason })
  })

  it('célula com estilo e rebus (fixtures)', () => {
    expect(convert(parse(unsupportedCellStyle))).toMatchObject({ ok: false, reason: 'unsupported' })
    expect(convert(parse(unsupportedRebus))).toMatchObject({ ok: false, reason: 'unsupported' })
  })

  it('resposta com campo renomeado não passa no schema (SC-005)', () => {
    expect(agilmenteResponseSchema.safeParse(changedShape).success).toBe(false)
  })

  it('aceita dates ausente como lista vazia', () => {
    const body = valid()
    delete body.dates
    expect(convert(body)).toMatchObject({ ok: true, dates: [] })
  })
})
