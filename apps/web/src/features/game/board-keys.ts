import type { GameAction } from '../../domain/game/reducer'
import type { BoardKey } from './Board'

// Do que o tabuleiro captura do teclado para a ação do reducer.
export function boardKeyToAction(key: BoardKey): GameAction {
  switch (key.type) {
    case 'letter':
      return { type: 'type', key: key.key }
    case 'backspace':
      return { type: 'backspace' }
    case 'delete':
      return { type: 'delete' }
    case 'wordStart':
      return { type: 'wordStart' }
    case 'wordEnd':
      return { type: 'wordEnd' }
    case 'arrow':
      return { type: 'move', arrow: key.arrow }
    case 'nextWord':
      return { type: 'nextWord' }
    case 'previousWord':
      return { type: 'previousWord' }
  }
}
