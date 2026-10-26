import { describe, expect, it } from 'vitest'
import { convertCrosswordCompiler } from './convert'
import { readFixture } from './fixtures'
import { readXml } from '../common/xml'

const DATE = '2026-10-16'

function convertText(text: string) {
  const read = readXml(text)
  if (!read.ok) throw new Error(`fixture deveria ser XML válido: ${read.detail}`)
  return convertCrosswordCompiler(read.doc, 'daily', DATE)
}

const valid = () => readFixture('daily-valid.xml')

// Variante da fixture válida: cada par troca um trecho que precisa existir uma única vez.
function variant(...pairs: [string, string][]): string {
  let text = valid()
  for (const [from, to] of pairs) {
    if (text.split(from).length !== 2) throw new Error(`trecho não é único: ${from}`)
    text = text.replace(from, to)
  }
  return text
}

const open = (number: number | null = null) => ({ kind: 'open', number })
const block = { kind: 'block' }

describe('convertCrosswordCompiler com a fixture válida', () => {
  const result = convertText(valid())

  it('converte grade, palavras, dicas e letras (SC-001)', () => {
    expect(result.ok).toBe(true)
    if (!result.ok) return
    const { puzzle, solution, dates } = result

    expect(puzzle).toMatchObject({ source: 'cruzadaonline', level: 'daily', date: DATE })
    expect(puzzle.attribution).toEqual({
      sourceName: 'Cruzada Online',
      title: null,
      author: null,
      copyright: 'Cruzada Online',
    })
    expect(puzzle.grid).toEqual({
      width: 5,
      height: 5,
      cells: [
        [open(1), open(), open(2), open(), block],
        [open(), block, open(), block, open(3)],
        [open(4), open(), open(), open(), open()],
        [open(), block, open(), block, open()],
        [block, open(5), open(), open(), open()],
      ],
    })
    expect(puzzle.words).toEqual([
      { number: 1, direction: 'across', row: 0, col: 0, length: 4, clue: 'Sem umidade.' },
      {
        number: 4,
        direction: 'across',
        row: 2,
        col: 0,
        length: 5,
        clue: 'Prender com “laço” (…).',
      },
      {
        number: 5,
        direction: 'across',
        row: 4,
        col: 1,
        length: 4,
        clue: 'Filha dos mesmos pais (fem.).',
      },
      {
        number: 1,
        direction: 'down',
        row: 0,
        col: 0,
        length: 4,
        clue: 'Cômodo da casa & da escola.',
      },
      {
        number: 2,
        direction: 'down',
        row: 0,
        col: 2,
        length: 5,
        clue: 'Perseguir animais no campo.',
      },
      { number: 3, direction: 'down', row: 1, col: 4, length: 4, clue: 'Parente próxima.' },
    ])
    expect(solution.cells).toEqual([
      ['S', 'E', 'C', 'O', null],
      ['A', null, 'A', null, 'I'],
      ['L', 'A', 'Ç', 'A', 'R'],
      ['A', null, 'A', null, 'M'],
      [null, 'I', 'R', 'M', 'Ã'],
    ])
    expect(dates).toEqual([])
  })

  it('não guarda o link de notícia nem a marcação das dicas (FR-005)', () => {
    expect(JSON.stringify(result)).not.toContain('example.invalid')
    expect(JSON.stringify(result)).not.toContain('<i>')
  })

  it('a parte pública não contém letra da resposta', () => {
    if (!result.ok) throw new Error('deveria converter')
    expect(JSON.stringify(result.puzzle.grid)).not.toMatch(/"(solution|letter)"/)
    expect(result.puzzle).not.toHaveProperty('solution')
  })

  it('usa os direitos do arquivo quando vierem preenchidos', () => {
    const converted = convertText(
      variant(['<copyright></copyright>', '<copyright>Direitos &amp; cia.</copyright>']),
    )
    expect(converted.ok && converted.puzzle.attribution.copyright).toBe('Direitos & cia.')
  })

  it('letra em minúscula é guardada em maiúscula', () => {
    const converted = convertText(
      variant(['<cell x="3" y="3" solution="Ç"/>', '<cell x="3" y="3" solution="ç"/>']),
    )
    expect(converted.ok && converted.solution.cells[2]?.[2]).toBe('Ç')
  })
})

describe('convertCrosswordCompiler com fixtures de falha (SC-002)', () => {
  it.each([
    ['word-without-clue.xml', 'unexpected-format'],
    ['clue-number-mismatch.xml', 'unexpected-format'],
    ['changed-shape.xml', 'unexpected-format'],
    ['unsupported-multi-letter.xml', 'unsupported'],
  ])('%s → %s', (name, reason) => {
    const converted = convertText(readFixture(name))
    expect(converted).toMatchObject({ ok: false, reason })
  })

  it.each<[string, [string, string][], string]>([
    [
      'célula repetida',
      [
        [
          '<cell x="2" y="1" solution="E"/>',
          '<cell x="2" y="1" solution="E"/><cell x="2" y="1" solution="E"/>',
        ],
      ],
      'unexpected-format',
    ],
    ['célula faltando', [['<cell x="2" y="1" solution="E"/>', '']], 'unexpected-format'],
    [
      'célula fora da grade',
      [
        [
          '<cell x="2" y="1" solution="E"/>',
          '<cell x="2" y="1" solution="E"/><cell x="6" y="1" solution="E"/>',
        ],
      ],
      'unexpected-format',
    ],
    [
      'tipo de célula desconhecido',
      [['<cell x="5" y="1" type="block"/>', '<cell x="5" y="1" type="void"/>']],
      'unsupported',
    ],
    [
      'célula aberta sem letra',
      [['<cell x="2" y="1" solution="E"/>', '<cell x="2" y="1"/>']],
      'unexpected-format',
    ],
    [
      'palavra de uma letra',
      [['<word id="1" x="1-4" y="1"/>', '<word id="1" x="1" y="1"/>']],
      'unexpected-format',
    ],
    [
      'palavra com os dois eixos em intervalo',
      [['<word id="1" x="1-4" y="1"/>', '<word id="1" x="1-4" y="1-4"/>']],
      'unexpected-format',
    ],
    [
      'intervalo decrescente',
      [['<word id="1" x="1-4" y="1"/>', '<word id="1" x="4-1" y="1"/>']],
      'unsupported',
    ],
    [
      'duas dicas para a mesma palavra',
      [
        [
          '<clue word="3" number="5"',
          '<clue word="1" number="1" format="4">Repetida.</clue><clue word="3" number="5"',
        ],
      ],
      'unexpected-format',
    ],
    [
      'dica para palavra inexistente',
      [['<clue word="3" number="5"', '<clue word="9" number="5"']],
      'unexpected-format',
    ],
    [
      'formato inteiro diferente do tamanho',
      [['<clue word="1" number="1" format="4">', '<clue word="1" number="1" format="3">']],
      'unexpected-format',
    ],
    ['dica vazia', [['>Sem umidade.<', '> <i></i> <']], 'unexpected-format'],
    [
      'palavra passando por bloco',
      [['<word id="3" x="2-5" y="5"/>', '<word id="3" x="1-5" y="5"/>']],
      'unexpected-format',
    ],
  ])('%s', (_label, pairs, reason) => {
    expect(convertText(variant(...pairs))).toMatchObject({ ok: false, reason })
  })

  it('formato composto não é conferido', () => {
    const converted = convertText(
      variant(['<clue word="1" number="1" format="4">', '<clue word="1" number="1" format="2,2">']),
    )
    expect(converted.ok).toBe(true)
  })

  it('o detalhe da falha não traz texto de dica nem letras', () => {
    const converted = convertText(readFixture('word-without-clue.xml'))
    expect(converted.ok).toBe(false)
    if (converted.ok) return
    expect(converted.detail).not.toMatch(/Parente|IRMÃ|SECO/)
  })
})

describe('mudança na estrutura do arquivo (SC-004)', () => {
  it.each<[string, [string, string][]]>([
    [
      'atributo solution removido',
      [['<cell x="1" y="3" solution="L" number="4"/>', '<cell x="1" y="3" number="4"/>']],
    ],
    [
      'largura com outro tipo',
      [['<grid width="5" height="5">', '<grid width="cinco" height="5">']],
    ],
    [
      'grupos de dicas removidos',
      [
        [
          '<clues ordering="normal"><title><b>HORIZONTAL</b></title>',
          '<extra><title><b>HORIZONTAL</b></title>',
        ],
        [
          '</clue></clues><clues ordering="normal"><title><b>VERTICAL</b></title>',
          '</clue></extra><clues ordering="normal"><title><b>VERTICAL</b></title>',
        ],
      ],
    ],
    ['vínculo word da dica removido', [['<clue word="1" number="1"', '<clue number="1"']]],
  ])('%s deixa de converter', (_label, pairs) => {
    expect(convertText(variant(...pairs)).ok).toBe(false)
  })

  it('cell renomeado para square deixa de converter', () => {
    expect(convertText(valid().replaceAll('<cell ', '<square ')).ok).toBe(false)
  })
})
