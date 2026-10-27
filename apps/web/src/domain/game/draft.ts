import { activeWord, type PuzzleIndex } from './navigation'
import type { GameState } from './state'

export function hasAnyDraft(draft: (string | null)[][]): boolean {
  return draft.some((row) => row.some((letter) => letter != null))
}

// Palavra ativa com algum rascunho.
export function wordHasDraft(index: PuzzleIndex, state: GameState): boolean {
  const word = activeWord(index, state.selected, state.direction)
  return word ? index.cellsOf(word).some(({ row, col }) => state.draft[row]?.[col] != null) : false
}

// Invariante: rascunho só em casa livre; em modo leitura não há rascunho. Devolve o mesmo estado
// quando nada muda, para não redesenhar o tabuleiro à toa.
export function pruneDraft(state: GameState): GameState {
  const completed = state.mode === 'completed'
  let changed = false
  const draft = state.draft.map((line, row) => {
    const next = line.map((letter, col) =>
      letter != null && (completed || state.cells[row]?.[col] != null || state.locked[row]?.[col])
        ? null
        : letter,
    )
    if (next.every((letter, col) => letter === line[col])) return line
    changed = true
    return next
  })
  return changed ? { ...state, draft } : state
}
