import type { Word } from '@cruzadinha/shared'
import type { PuzzleIndex } from './navigation'

// Texto para pedir ajuda com uma palavra (feature 032): "Ter opinião (5): A___R". Mostra só o que a
// pessoa digitou, certo ou errado, e nunca consulta a solução; `_` é uma célula vazia.
export function clueCopyText(index: PuzzleIndex, cells: (string | null)[][], word: Word): string {
  const letters = index
    .cellsOf(word)
    .map(({ row, col }) => cells[row]?.[col] ?? '_')
    .join('')
  return `${word.clue} (${word.length}): ${letters}`
}
