import type { Solution } from '@cruzadinha/shared'
import { plainLetter } from './letters'
import { cellKey, type GameState } from './state'

// Verificação ao digitar (feature 047): marcas a desenhar quando a opção está ligada. As letras
// erradas ganham `wrong` sem tocar em `state.marks`, então desligar a opção as apaga e o que é
// salvo não muda. Casa vazia, travada (revelada) ou só com rascunho nunca é marcada.
export function withAutoMarks(state: GameState, solution: Solution): GameState['marks'] {
  let marks = state.marks
  state.cells.forEach((line, row) =>
    line.forEach((value, col) => {
      const expected = solution.cells[row]?.[col]
      if (!expected || value == null || state.locked[row]?.[col]) return
      if (plainLetter(expected) === value) return
      if (marks === state.marks) marks = { ...state.marks }
      marks[cellKey({ row, col })] = 'wrong'
    }),
  )
  return marks
}
