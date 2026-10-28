import { describe, expect, it } from 'vitest'
import { resolveBoardKey, SHORTCUT_GROUPS, type BoardKey } from './shortcuts'

const ACTIONS = SHORTCUT_GROUPS.flatMap((group) => group.shortcuts)

describe('resolveBoardKey', () => {
  it('resolve cada tecla da tabela (menos ?) para a ação declarada', () => {
    for (const shortcut of ACTIONS) {
      for (const item of shortcut.keys) {
        if (item.key === null || item.key === '?') continue
        const result = resolveBoardKey(item.key, item.shift)
        const type = typeof result === 'string' ? result : result?.type
        expect(type, item.label).toBe(shortcut.action)
      }
    }
  })

  it('? e teclas fora da tabela não resolvem', () => {
    expect(resolveBoardKey('?', true)).toBeNull()
    expect(resolveBoardKey('F5', false)).toBeNull()
    expect(resolveBoardKey('Enter', false)).toBeNull()
  })

  it('separa Tab de Shift+Tab e resolve caractere único como letra', () => {
    expect(resolveBoardKey('Tab', false)).toEqual({ type: 'nextWord' })
    expect(resolveBoardKey('Tab', true)).toEqual({ type: 'previousWord' })
    expect(resolveBoardKey('ç', false)).toEqual({ type: 'letter', key: 'ç' })
    expect(resolveBoardKey('ArrowUp', false)).toEqual({ type: 'arrow', arrow: 'ArrowUp' })
  })

  it('toda ação do tabuleiro aparece na tabela', () => {
    const all: BoardKey['type'][] = [
      'letter',
      'backspace',
      'delete',
      'arrow',
      'wordStart',
      'wordEnd',
      'nextWord',
      'previousWord',
    ]
    for (const type of all)
      expect(
        ACTIONS.some((s) => s.action === type),
        type,
      ).toBe(true)
  })
})
