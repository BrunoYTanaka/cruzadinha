import { createGame, type GameAction } from '../../../domain/game/reducer'
import { plainLetter } from '../../../domain/game/letters'
import type { Direction } from '../../../domain/game/state'
import { SAMPLE_PUZZLE, SAMPLE_SOLUTION } from './sample'

// Estado da mini cruzada da landing (feature 049). Só regras puras: nada é salvo nem enviado.

// Sem limite de ajuda: a mini cruzada não tem ajudas, relógio nem progresso.
export const miniGame = createGame({
  puzzle: SAMPLE_PUZZLE,
  solution: SAMPLE_SOLUTION,
  limits: { letters: null, words: null },
})

// Como no mockup, a grade abre com as três primeiras letras de COSTA e a seleção na quarta casa.
// O jogo abre na primeira casa, na horizontal; selecionar de novo essa casa trocaria a direção.
export const START_STATE = (['C', 'O', 'S'] as const).reduce(
  (state, key) => miniGame.reducer(state, { type: 'type', key }),
  miniGame.initialState,
)

// `clear` volta ao estado de abertura; o resto é do reducer do jogo.
export function miniReducer(state: typeof START_STATE, action: GameAction | 'clear') {
  return action === 'clear' ? START_STATE : miniGame.reducer(state, action)
}

export type SolvedWord = { number: number; direction: Direction }

// Palavra completa e igual à resposta (sem acento, como no jogo).
export function solvedWords(state: typeof START_STATE): SolvedWord[] {
  return SAMPLE_PUZZLE.words
    .filter((word) =>
      miniGame.index.cellsOf(word).every(({ row, col }) => {
        const typed = state.cells[row]?.[col]
        const expected = SAMPLE_SOLUTION.cells[row]?.[col]
        return typed != null && expected != null && plainLetter(typed) === expected
      }),
    )
    .map(({ number, direction }) => ({ number, direction }))
}
