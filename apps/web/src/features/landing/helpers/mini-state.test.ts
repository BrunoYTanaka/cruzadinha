import { afterEach, describe, expect, it, vi } from 'vitest'
import { miniGame, miniReducer, solvedWords, START_STATE } from './mini-state'
import type { GameAction } from '../../../domain/game/reducer'

const type = (state: typeof START_STATE, letters: string) =>
  [...letters].reduce(
    (current, key) => miniReducer(current, { type: 'type', key } as GameAction),
    state,
  )

afterEach(() => vi.restoreAllMocks())

describe('estado da mini cruzada', () => {
  it('abre com C, O e S na primeira linha e mais nada', () => {
    const letters = START_STATE.cells.flat().filter((cell) => cell != null)
    expect(START_STATE.cells[0]?.slice(0, 3)).toEqual(['C', 'O', 'S'])
    expect(letters).toHaveLength(3)
    expect(START_STATE.selected).toEqual({ row: 0, col: 3 })
    expect(solvedWords(START_STATE)).toEqual([])
  })

  it('"clear" depois de digitar volta ao estado de abertura', () => {
    expect(miniReducer(type(START_STATE, 'TA'), 'clear')).toBe(START_STATE)
  })

  it('completar COSTA resolve 1 horizontal, com ou sem acento', () => {
    expect(solvedWords(type(START_STATE, 'TA'))).toEqual([{ number: 1, direction: 'across' }])
    const accented = type(
      miniReducer(START_STATE, { type: 'select', position: { row: 0, col: 3 } }),
      'TÁ',
    )
    expect(solvedWords(accented)).toContainEqual({ number: 1, direction: 'across' })
  })

  it('resolver tudo dá seis palavras e o modo de conclusão', () => {
    let state = START_STATE
    // Cada palavra: seleciona, vai ao começo (Home) e digita tudo, por cima do que já houver.
    const fill = (number: number, direction: 'across' | 'down', letters: string) => {
      state = miniReducer(state, { type: 'selectWord', number, direction })
      state = miniReducer(state, { type: 'wordStart' })
      state = type(state, letters)
    }
    fill(1, 'across', 'COSTA')
    fill(4, 'across', 'MUNDO')
    fill(5, 'across', 'OCASO')
    fill(1, 'down', 'CAMPO')
    fill(2, 'down', 'SONDA')
    fill(3, 'down', 'ATOMO')
    expect(solvedWords(state)).toHaveLength(6)
    expect(state.mode).toBe('completed')
  })

  it('não toca em armazenamento nem em rede', () => {
    const local = vi.spyOn(Storage.prototype, 'getItem')
    const fetchSpy = vi.spyOn(globalThis, 'fetch')
    type(START_STATE, 'TA')
    expect(local).not.toHaveBeenCalled()
    expect(fetchSpy).not.toHaveBeenCalled()
    expect(miniGame.index).toBeDefined()
  })
})
