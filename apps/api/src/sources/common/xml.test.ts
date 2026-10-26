import { describe, expect, it } from 'vitest'
import { readFixture as fixture } from '../cruzadaonline/fixtures'
import { readXml } from './xml'

type Node = Record<string, unknown>

function crosswordOf(doc: unknown): Node {
  const root = (doc as Node)['crossword-compiler'] as Node
  const puzzle = root['rectangular-puzzle'] as Node
  return puzzle.crossword as Node
}

describe('readXml', () => {
  it('lê a fixture válida com listas fixas e atributos como texto', () => {
    const result = readXml(fixture('daily-valid.xml'))
    expect(result.ok).toBe(true)
    if (!result.ok) return

    const crossword = crosswordOf(result.doc)
    const grid = crossword.grid as Node
    expect(grid.width).toBe('5')
    expect(Array.isArray(grid.cell)).toBe(true)
    expect(Array.isArray(crossword.word)).toBe(true)
    expect(Array.isArray(crossword.clues)).toBe(true)
    // Os atributos predefinidos são decodificados.
    expect((grid['grid-look'] as Node).font).toBe('"Arial"')

    const clues = crossword.clues as Node[]
    const across = clues[0]!.clue as Node[]
    expect(Array.isArray(across)).toBe(true)
    // `word` é atributo da dica: continua texto, não vira lista.
    expect(across[0]!.word).toBe('1')
    // O conteúdo da dica chega cru, com a marcação, para `clueText` limpar.
    expect(across[2]!['#text']).toBe('Filha dos mesmos pais (<i>fem.</i>).')
  })

  it('XML mal formado vira falha com o código do erro, sem trecho do corpo', () => {
    const result = readXml(fixture('malformed.xml'))
    expect(result.ok).toBe(false)
    if (result.ok) return
    expect(result.detail).toMatch(/^xml: /)
    expect(result.detail).not.toContain('SECO')
  })
})
