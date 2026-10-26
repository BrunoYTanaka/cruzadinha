import { useMediaQuery } from '../../../shared/hooks/useMediaQuery'

// O teclado na tela aparece com ponteiro grosseiro (toque) ou em tela estreita; um teclado físico
// continua funcionando em qualquer caso.
export const ON_SCREEN_KEYBOARD_QUERY = '(pointer: coarse), (max-width: 720px)'

export function useOnScreenKeyboard(): boolean {
  return useMediaQuery(ON_SCREEN_KEYBOARD_QUERY)
}
