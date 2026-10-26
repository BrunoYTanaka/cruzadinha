import type { Solution } from '@cruzadinha/shared'
import { plainLetter } from './letters'

// Toda célula aberta tem a letra da solução (sem acento: o jogador só digita A–Z e Ç); a
// comparação ignora marcas e travas.
export function isSolved(cells: (string | null)[][], solution: Solution): boolean {
  let any = false
  for (let row = 0; row < solution.cells.length; row++) {
    const line = solution.cells[row] ?? []
    for (let col = 0; col < line.length; col++) {
      const expected = line[col]
      if (expected == null) continue
      any = true
      if (cells[row]?.[col] !== plainLetter(expected)) return false
    }
  }
  return any
}
