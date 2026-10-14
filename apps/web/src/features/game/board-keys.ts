import type { GameAction } from '../../game-logic/reducer'
import type { BoardKey } from './Board'

// Do que o tabuleiro captura do teclado para a ação do reducer.
export function boardKeyToAction(key: BoardKey): GameAction {
  switch (key.type) {
    case 'letter':
      return { type: 'type', key: key.key }
    case 'backspace':
      return { type: 'backspace' }
    case 'arrow':
      return { type: 'move', arrow: key.arrow }
    case 'nextWord':
      return { type: 'nextWord' }
    case 'previousWord':
      return { type: 'previousWord' }
  }
}
