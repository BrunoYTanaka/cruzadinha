import { useMediaQuery } from '../../lib/useMediaQuery'
import { useOnScreenKeyboard } from './useOnScreenKeyboard'

// Mesmo limite em que o CSS da feature 010 põe as dicas ao lado do tabuleiro.
export const DESKTOP_LAYOUT_QUERY = '(min-width: 861px)'

// Layout de computador da tela de jogo: janela larga e sem teclado na tela. É uma condição em JS,
// e não uma media query CSS, porque a alça de tamanho e a posição da dica ativa dependem dela; o CSS
// novo fica sob uma classe aplicada a partir daqui, para tablet e celular não receberem metade do
// layout.
export function useDesktopLayout(): boolean {
  const wide = useMediaQuery(DESKTOP_LAYOUT_QUERY)
  const onScreenKeyboard = useOnScreenKeyboard()
  return wide && !onScreenKeyboard
}
