import type { Word } from '@cruzadinha/shared'
import { describe, expect, it } from 'vitest'
import { cellsFrom, makePuzzle, TINY } from '../test/fixtures'
import { clueCopyText } from './clue-text'
import { wordKey } from './clue-strike'
import { buildIndex } from './navigation'

// CAL / A#O / SOL: 1 horizontal CAL, 3 horizontal SOL, 1 vertical CAS, 2 vertical LOL.
const puzzle = makePuzzle(TINY)
const index = buildIndex(puzzle)
const word = (key: string): Word => puzzle.words.find((item) => wordKey(item) === key)!
const text = (rows: string[], key: string) => clueCopyText(index, cellsFrom(rows), word(key))
const clue = (key: string) => word(key).clue

describe('clueCopyText', () => {
  it('traz a dica, o tamanho e as letras com _ nas vazias', () => {
    expect(text(['C.L', '.#.', '...'], '1across')).toBe(`${clue('1across')} (3): C_L`)
  })

  it('palavra vazia vira só _', () => {
    expect(text(['...', '.#.', '...'], '1across')).toBe(`${clue('1across')} (3): ___`)
  })

  it('palavra completa traz todas as letras', () => {
    expect(text(['CAL', '.#.', '...'], '1across')).toBe(`${clue('1across')} (3): CAL`)
  })

  it('palavra vertical lê a coluna, com letras do cruzamento', () => {
    expect(text(['C..', 'A#.', '...'], '1down')).toBe(`${clue('1down')} (3): CA_`)
  })

  it('copia a letra errada como digitada, sem consultar a solução', () => {
    expect(text(['XYZ', '.#.', '...'], '1across')).toBe(`${clue('1across')} (3): XYZ`)
  })

  it('mantém a letra acentuada', () => {
    expect(text(['CÃL', '.#.', '...'], '1across')).toBe(`${clue('1across')} (3): CÃL`)
  })

  it('sempre tem tantas posições quanto o tamanho', () => {
    for (const item of puzzle.words) {
      const out = clueCopyText(index, cellsFrom(['C.L', 'A#O', '.O.']), item)
      expect(out.slice(out.lastIndexOf(': ') + 2)).toHaveLength(item.length)
    }
  })
})
