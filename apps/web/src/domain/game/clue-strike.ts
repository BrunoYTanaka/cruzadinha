import type { Solution, Word } from '@cruzadinha/shared'
import { plainLetter } from './letters'
import type { PuzzleIndex } from './navigation'

// Quando uma dica da lista fica riscada: "ao acertar" (padrão) ou "ao preencher", escolhido nas
// configurações (feature 021).
export type StrikeMode = 'solved' | 'filled'

// Chave de uma palavra nas listas de dicas: "6across".
export function wordKey(word: Word): string {
  return `${word.number}${word.direction}`
}

// Toda célula da palavra tem a letra da solução, pela mesma comparação da conclusão (`isSolved`).
export function isWordSolved(
  index: PuzzleIndex,
  cells: (string | null)[][],
  solution: Solution,
  word: Word,
): boolean {
  return index.cellsOf(word).every(({ row, col }) => {
    const expected = solution.cells[row]?.[col]
    const letter = cells[row]?.[col]
    return expected != null && letter != null && letter === plainLetter(expected)
  })
}

// Toda célula da palavra tem uma letra, certa ou errada.
export function isWordFilled(index: PuzzleIndex, cells: (string | null)[][], word: Word): boolean {
  return index.cellsOf(word).every(({ row, col }) => cells[row]?.[col] != null)
}

export function struckWords(
  index: PuzzleIndex,
  cells: (string | null)[][],
  solution: Solution,
  mode: StrikeMode,
): ReadonlySet<string> {
  switch (mode) {
    case 'solved':
      return new Set(
        index.puzzle.words
          .filter((word) => isWordSolved(index, cells, solution, word))
          .map(wordKey),
      )
    case 'filled':
      return new Set(
        index.puzzle.words.filter((word) => isWordFilled(index, cells, word)).map(wordKey),
      )
  }
}
