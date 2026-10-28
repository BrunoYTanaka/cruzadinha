import type { Arrow } from '../../../domain/game/navigation'

export type BoardKey =
  | { type: 'letter'; key: string }
  | { type: 'backspace' }
  | { type: 'delete' }
  | { type: 'arrow'; arrow: Arrow }
  | { type: 'wordStart' }
  | { type: 'wordEnd' }
  | { type: 'nextWord' }
  | { type: 'previousWord' }

export type ShortcutAction = BoardKey['type'] | 'releaseTab' | 'openShortcuts'

export type ShortcutKey = {
  // Valor de `KeyboardEvent.key`; `null` para "A a Z" (qualquer caractere único).
  key: string | null
  shift: boolean
  label: string
  // Nome lido quando `label` é um símbolo.
  spoken?: string
}

export type Shortcut = { keys: ShortcutKey[]; action: ShortcutAction; description: string }

export type ShortcutGroup = { title: string; shortcuts: Shortcut[] }

function key(label: string, extra: Partial<ShortcutKey> = {}): ShortcutKey {
  return { key: label, shift: false, label, ...extra }
}

// Fonte única dos atalhos do tabuleiro: o `Board` traduz a tecla por ela e o diálogo a lista.
export const SHORTCUT_GROUPS: ShortcutGroup[] = [
  {
    title: 'Mover',
    shortcuts: [
      {
        keys: [
          key('ArrowUp', { label: '↑', spoken: 'seta para cima' }),
          key('ArrowDown', { label: '↓', spoken: 'seta para baixo' }),
          key('ArrowLeft', { label: '←', spoken: 'seta para a esquerda' }),
          key('ArrowRight', { label: '→', spoken: 'seta para a direita' }),
        ],
        action: 'arrow',
        description: 'Move para a célula vizinha e muda a direção',
      },
      { keys: [key('Home')], action: 'wordStart', description: 'Vai ao início da palavra' },
      { keys: [key('End')], action: 'wordEnd', description: 'Vai ao fim da palavra' },
      { keys: [key('Tab')], action: 'nextWord', description: 'Vai para a próxima palavra' },
      {
        keys: [key('Tab', { shift: true, label: 'Shift+Tab' })],
        action: 'previousWord',
        description: 'Volta para a palavra anterior',
      },
    ],
  },
  {
    title: 'Escrever',
    shortcuts: [
      {
        keys: [{ key: null, shift: false, label: 'A a Z' }],
        action: 'letter',
        description: 'Escreve a letra e avança',
      },
      { keys: [key('Backspace')], action: 'backspace', description: 'Apaga a letra e volta' },
      { keys: [key('Delete')], action: 'delete', description: 'Apaga a letra sem mover' },
    ],
  },
  {
    title: 'Sair do tabuleiro',
    shortcuts: [
      {
        keys: [key('Escape', { label: 'Esc' })],
        action: 'releaseTab',
        description: 'Libera o próximo Tab para sair do tabuleiro',
      },
    ],
  },
  {
    title: 'Ajuda',
    shortcuts: [
      { keys: [key('?')], action: 'openShortcuts', description: 'Abre esta lista de atalhos' },
    ],
  },
]

const ARROWS: readonly string[] = ['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight']

// Tecla → o que o tabuleiro faz. `?` é da página (abre o diálogo), então não resolve aqui.
export function resolveBoardKey(key: string, shiftKey: boolean): BoardKey | 'releaseTab' | null {
  if (key === '?') return null
  for (const group of SHORTCUT_GROUPS) {
    for (const shortcut of group.shortcuts) {
      if (
        !shortcut.keys.some(
          (item) => item.key === key && item.shift === (key === 'Tab' && shiftKey),
        )
      )
        continue
      if (shortcut.action === 'releaseTab') return 'releaseTab'
      if (shortcut.action === 'arrow' && ARROWS.includes(key)) {
        return { type: 'arrow', arrow: key as Arrow }
      }
      if (
        shortcut.action !== 'letter' &&
        shortcut.action !== 'openShortcuts' &&
        shortcut.action !== 'arrow'
      ) {
        return { type: shortcut.action }
      }
    }
  }
  return key.length === 1 ? { type: 'letter', key } : null
}
