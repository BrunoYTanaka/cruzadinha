import { describe, expect, it } from 'vitest'
import { parseWordList, wordsFor } from './word-list'

const TEXT = 'AGUA\tágua\t1\nSOL\tsol\t1\nCAFEZAL\tcafezal\t3\nLUZ\tluz\t2'

describe('parseWordList', () => {
  it('lê as entradas na ordem', () => {
    expect(parseWordList(TEXT).map((w) => w.plain)).toEqual(['AGUA', 'SOL', 'CAFEZAL', 'LUZ'])
    expect(parseWordList(TEXT)[0]).toEqual({ plain: 'AGUA', form: 'água', band: 1 })
  })

  it('falha em linha malformada', () => {
    expect(() => parseWordList('AGUA\tágua')).toThrow()
    expect(() => parseWordList('AGUA\tágua\t9')).toThrow()
  })
})

describe('wordsFor', () => {
  const list = parseWordList(TEXT)

  it('filtra por faixa', () => {
    expect(wordsFor(list, { maxBand: 2 }).map((w) => w.plain)).toEqual(['AGUA', 'SOL', 'LUZ'])
  })

  it('tira os plain excluídos', () => {
    expect(wordsFor(list, { maxBand: 3, exclude: new Set(['SOL']) }).map((w) => w.plain)).toEqual([
      'AGUA',
      'CAFEZAL',
      'LUZ',
    ])
  })
})
