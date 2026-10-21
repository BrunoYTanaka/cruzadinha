import { describe, expect, it } from 'vitest'
import { cellsFrom, makePuzzle, makeSolution, TINY } from '../test/fixtures'
import { isWordFilled, isWordSolved, struckWords, wordKey } from './clue-strike'
import { buildIndex } from './navigation'

// CAL / A#O / SOL: 1 horizontal CAL, 3 horizontal SOL, 1 vertical CAS, 2 vertical LOL.
const puzzle = makePuzzle(TINY)
const solution = makeSolution(TINY)
const index = buildIndex(puzzle)
const word = (key: string) => puzzle.words.find((item) => wordKey(item) === key)!
const struck = (rows: string[]) => struckWords(index, cellsFrom(rows), solution, 'solved')

describe('wordKey', () => {
  it('junta número e direção', () => {
    expect(wordKey(word('1across'))).toBe('1across')
    expect(wordKey(word('2down'))).toBe('2down')
  })
})

describe('isWordSolved', () => {
  it('vazia ou incompleta não está resolvida', () => {
    expect(isWordSolved(index, cellsFrom(['...', '.#.', '...']), solution, word('1across'))).toBe(
      false,
    )
    expect(isWordSolved(index, cellsFrom(['CA.', '.#.', '...']), solution, word('1across'))).toBe(
      false,
    )
  })

  it('completa e certa está resolvida', () => {
    expect(isWordSolved(index, cellsFrom(['CAL', '.#.', '...']), solution, word('1across'))).toBe(
      true,
    )
  })

  it('completa com uma letra errada não está resolvida (FR-002)', () => {
    expect(isWordSolved(index, cellsFrom(['CXL', '.#.', '...']), solution, word('1across'))).toBe(
      false,
    )
  })

  it('letra acentuada da solução aceita a letra simples (FR-001)', () => {
    const accented = makePuzzle(['PÉ', 'A#'])
    const cells = cellsFrom(['PE', '.#'])
    const across = accented.words.find((item) => wordKey(item) === '1across')!
    expect(isWordSolved(buildIndex(accented), cells, makeSolution(['PÉ', 'A#']), across)).toBe(true)
  })
})

describe('struckWords', () => {
  it('só risca as palavras certas', () => {
    expect(struck(['...', '.#.', '...'])).toEqual(new Set())
    // 1 horizontal certa; 1 vertical (C, A, X) completa e errada.
    expect(struck(['CAL', 'A#.', 'X..'])).toEqual(new Set(['1across']))
  })

  it('a letra do cruzamento muda as duas palavras', () => {
    // CAL e CAS certas; trocar o C tira as duas.
    expect(struck(['CAL', 'A#.', 'S..'])).toEqual(new Set(['1across', '1down']))
    expect(struck(['XAL', 'A#.', 'S..'])).toEqual(new Set())
    // Corrigir o S da vertical (que cruza SOL) risca a horizontal de baixo também.
    expect(struck(['CAL', 'A#.', 'XOL'])).toEqual(new Set(['1across']))
    expect(struck(['CAL', 'A#.', 'SOL'])).toEqual(new Set(['1across', '1down', '3across']))
  })

  it('grade certa risca todas as dicas', () => {
    expect(struck(TINY)).toEqual(new Set(puzzle.words.map(wordKey)))
  })

  it('numa grade 15 x 15 certa, todas as dicas ficam riscadas', () => {
    const rows = Array.from({ length: 15 }, (_, row) =>
      Array.from({ length: 15 }, (_, col) => String.fromCharCode(65 + ((row + col) % 26))).join(''),
    )
    const big = makePuzzle(rows)
    const keys = struckWords(buildIndex(big), cellsFrom(rows), makeSolution(rows), 'solved')
    expect(keys.size).toBe(30)
    expect(keys).toEqual(new Set(big.words.map(wordKey)))
  })
})

describe('modo ao preencher (feature 021)', () => {
  const filled = (rows: string[]) => struckWords(index, cellsFrom(rows), solution, 'filled')

  it('isWordFilled aceita qualquer letra em todas as células', () => {
    expect(isWordFilled(index, cellsFrom(['CXL', '.#.', '...']), word('1across'))).toBe(true)
    expect(isWordFilled(index, cellsFrom(['CA.', '.#.', '...']), word('1across'))).toBe(false)
  })

  it('risca palavras completas, certas ou erradas, e não as incompletas', () => {
    expect(filled(['...', '.#.', '...'])).toEqual(new Set())
    // 1 horizontal certa, 1 vertical (C, A, X) completa e errada, 3 horizontal incompleta.
    expect(filled(['CAL', 'A#.', 'X..'])).toEqual(new Set(['1across', '1down']))
  })

  it('o modo ao acertar continua igual', () => {
    expect(struck(['CAL', 'A#.', 'X..'])).toEqual(new Set(['1across']))
  })
})
