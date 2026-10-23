import { wordBoundaries } from '@cruzadinha/shared'
import { describe, expect, it } from 'vitest'
import { readXml } from '../cruzadaonline/xml'
import { convertClube, type ConvertResult } from './convert'
import { readFixture } from './fixtures'

const DATE = '2026-10-19'

function convert(xml: string, author: string | null = null): ConvertResult {
  const read = readXml(xml)
  if (!read.ok) throw new Error(`fixture não é XML: ${read.detail}`)
  return convertClube(read.doc, 'daily', DATE, author)
}

const valid = () => readFixture('game-valid.xml')

function failure(xml: string) {
  const result = convert(xml)
  if (result.ok) throw new Error('deveria falhar')
  return result
}

describe('convertClube', () => {
  it('converte a edição: grade, numeração derivada, palavras, dicas e letras', () => {
    const result = convert(valid())
    if (!result.ok) throw new Error(result.detail)
    const { puzzle, solution } = result

    expect(puzzle).toMatchObject({ source: 'clube', level: 'daily', date: DATE })
    expect(puzzle.grid.width).toBe(4)
    expect(puzzle.grid.height).toBe(3)
    expect(puzzle.grid.cells.flat().every((cell) => cell.kind === 'open')).toBe(true)
    expect(
      puzzle.grid.cells.map((row) => row.map((cell) => (cell.kind === 'open' ? cell.number : 0))),
    ).toEqual([
      [1, 2, 3, 4],
      [5, null, 6, null],
      [7, null, null, null],
    ])
    expect(solution.cells).toEqual([
      ['A', 'B', 'C', 'D'],
      ['E', 'F', 'Ç', 'H'],
      ['I', 'J', 'Á', 'L'],
    ])
    const across = puzzle.words.filter((word) => word.direction === 'across')
    expect(across.map(({ number, row, col, length }) => [number, row, col, length])).toEqual([
      [1, 0, 0, 2],
      [3, 0, 2, 2],
      [5, 1, 0, 2],
      [6, 1, 2, 2],
      [7, 2, 0, 4],
    ])
    expect(
      puzzle.words.filter((word) => word.direction === 'down').map((word) => word.number),
    ).toEqual([1, 2, 3, 4])
    expect(
      puzzle.words.find((word) => word.number === 3 && word.direction === 'across')?.clue,
    ).toBe('Segunda dupla & mais')
    expect(puzzle.words.find((word) => word.number === 5)?.clue).toBe('Terceira dupla')
    expect(result.dates).toEqual([])
  })

  it('as barras do arquivo coincidem com os limites desenhados pelo site', () => {
    const result = convert(valid())
    if (!result.ok) throw new Error(result.detail)
    expect(wordBoundaries(result.puzzle)).toEqual([
      { row: 0, col: 1, direction: 'across' },
      { row: 1, col: 1, direction: 'across' },
    ])
  })

  it('atribui "Cruzadas Clube", título e o autor da página, sem repetir o aviso de direitos', () => {
    const result = convert(valid(), 'Autora da Página')
    if (!result.ok) throw new Error(result.detail)
    expect(result.puzzle.attribution).toEqual({
      sourceName: 'Cruzadas Clube',
      title: 'Cruzadas clássicas 901',
      author: 'Autora da Página',
      copyright: null,
    })
  })

  it('sem autor da página usa o do arquivo', () => {
    const result = convert(valid())
    if (!result.ok) throw new Error(result.detail)
    expect(result.puzzle.attribution.author).toBe('Autora de Exemplo')
  })

  it('aceita célula solta entre duas palavras (corrida de uma letra entre barras)', () => {
    // 5 x 2: na linha de cima, AB | C | DE; a célula do meio só tem palavra vertical.
    const cell = (x: number, y: number, letter: string, bar = false) =>
      `<cell x="${x}" y="${y}" ${bar ? 'left-bar="true" ' : ''}solution="${letter}"/>`
    const cells = [
      ...'ABCDE'.split('').map((l, i) => cell(i + 1, 1, l, i === 2 || i === 3)),
      ...'FGHIJ'.split('').map((l, i) => cell(i + 1, 2, l)),
    ].join('')
    const xml =
      '<crossword-compiler-applet><rectangular-puzzle><crossword>' +
      `<grid width="5" height="2">${cells}</grid>` +
      '<word id="1" x="1-2" y="1"/><word id="2" x="4-5" y="1"/><word id="3" x="1-5" y="2"/>' +
      '<word id="4" x="3" y="1-2"/>' +
      '<clues><clue word="1" number="">a</clue><clue word="2" number="">b</clue><clue word="3" number="">c</clue></clues>' +
      '<clues><clue word="4" number="">d</clue></clues>' +
      '</crossword></rectangular-puzzle></crossword-compiler-applet>'
    const result = convert(xml)
    if (!result.ok) throw new Error(result.detail)
    expect(wordBoundaries(result.puzzle).filter((b) => b.row === 0)).toEqual([
      { row: 0, col: 1, direction: 'across' },
      { row: 0, col: 2, direction: 'across' },
    ])
  })

  describe('recusa o que não entende, sem puzzle parcial', () => {
    it('barra dentro de uma palavra', () => {
      const xml = valid().replace('x="2" y="3"', 'x="2" y="3" left-bar="true"')
      expect(failure(xml)).toMatchObject({ reason: 'unexpected-format' })
      expect(failure(xml).detail).toMatch(/left-bar não bate/)
    })

    it('palavras coladas sem a barra entre elas', () => {
      const xml = valid().replace('x="3" y="1" left-bar="true"', 'x="3" y="1"')
      expect(failure(xml).detail).toMatch(/left-bar não bate/)
    })

    it('barra de cima onde a palavra vertical continua', () => {
      const xml = valid().replace('x="1" y="2"', 'x="1" y="2" top-bar="true"')
      expect(failure(xml).detail).toMatch(/top-bar não bate/)
    })

    it('palavra sem dica', () => {
      const xml = valid().replace('<clue word="5" number="">Linha inteira</clue>', '')
      expect(failure(xml)).toMatchObject({
        reason: 'unexpected-format',
        detail: 'word 5: sem dica',
      })
    })

    it('dica que aponta para uma palavra inexistente', () => {
      const xml = valid().replace('<clue word="9"', '<clue word="99"')
      expect(failure(xml).detail).toBe('clue 99: palavra inexistente')
    })

    it('duas dicas para a mesma palavra', () => {
      const xml = valid().replace('<clue word="9"', '<clue word="8"')
      expect(failure(xml).detail).toMatch(/duas dicas/)
    })

    it('dica vazia ou com entidade desconhecida', () => {
      expect(failure(valid().replace('Coluna um', '')).detail).toMatch(/dica vazia/)
      expect(failure(valid().replace('Coluna um', 'Coluna&nbsp;um')).detail).toMatch(/dica vazia/)
    })

    it('palavra de uma letra', () => {
      const xml = valid().replace('<word id="1" x="1-2" y="1"/>', '<word id="1" x="1" y="1"/>')
      expect(failure(xml)).toMatchObject({ reason: 'unexpected-format' })
    })

    it('id de palavra repetido', () => {
      const xml = valid().replace('<word id="2"', '<word id="1"')
      expect(failure(xml).detail).toBe('word 1: id repetido')
    })

    it('célula com mais de uma letra é recurso não suportado', () => {
      const xml = valid().replace('solution="B"', 'solution="BB"')
      expect(failure(xml)).toMatchObject({ reason: 'unsupported' })
    })

    it('célula ausente, repetida ou fora da grade', () => {
      expect(failure(valid().replace(/<cell x="4" y="3"[^>]*\/>/, '')).detail).toBe(
        'cell 4,3: ausente',
      )
      expect(failure(valid().replace('<cell x="2" y="1"', '<cell x="1" y="1"')).detail).toBe(
        'cell 1,1: repetida',
      )
      expect(failure(valid().replace('<cell x="4" y="3"', '<cell x="5" y="3"')).detail).toBe(
        'cell 5,3: fora da grade',
      )
    })

    it('célula sem solução', () => {
      const xml = valid().replace('solution="B" ', '')
      expect(failure(xml).detail).toBe('cell 2,1: solução ausente')
    })

    it('estrutura alterada', () => {
      const xml = valid().replaceAll('rectangular-puzzle', 'rectangular-grid')
      expect(failure(xml)).toMatchObject({ reason: 'unexpected-format' })
    })

    it('palavra que sai da grade', () => {
      const xml = valid().replace('x="1-4" y="3"', 'x="1-5" y="3"')
      expect(failure(xml)).toMatchObject({ reason: 'unexpected-format' })
    })
  })

  it('o detalhe da falha nunca leva letras nem texto de dica', () => {
    const xml = valid().replace('solution="B"', 'solution="BB"')
    const { detail } = failure(xml)
    expect(detail).not.toMatch(/Primeira dupla|Linha inteira|Autora/)
  })
})
