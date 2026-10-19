import type { Solution, Word } from '@cruzadinha/shared'
import { plainLetter } from './letters'
import type { PuzzleIndex } from './navigation'

// Quando uma dica da lista fica riscada. Hoje só "ao acertar"; a preferência futura do jogador
// acrescenta 'filled' (ao preencher) e 'never' a esta união, sem mudar as telas.
export type StrikeMode = 'solved'

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
  }
}
