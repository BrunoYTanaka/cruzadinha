import { describe, expect, it } from 'vitest'
import { makePuzzle, makeSolution } from '../../test/fixtures'
import { createGame, type GameAction } from './reducer'
import type { GameState } from './state'
import { withAutoMarks } from './wrong-cells'

const ROWS = ['CASA', 'A#O#', 'MOLA']
const solution = makeSolution(ROWS)

function play(actions: GameAction[]): GameState {
  const game = createGame({
    puzzle: makePuzzle(ROWS),
    solution,
    limits: { letters: 2, words: 1 },
  })
  return actions.reduce(game.reducer, game.initialState)
}

const select = (row: number, col: number): GameAction => ({
  type: 'select',
  position: { row, col },
})
const type = (key: string): GameAction => ({ type: 'type', key })

describe('withAutoMarks', () => {
  it('não marca letra certa nem casa vazia', () => {
    const state = play([select(0, 0), type('c')])
    expect(withAutoMarks(state, solution)).toEqual({})
  })

  it('marca letra errada', () => {
    const state = play([select(0, 0), type('x')])
    expect(withAutoMarks(state, solution)).toEqual({ '0,0': 'wrong' })
  })

  it('não marca casa revelada por ajuda', () => {
    const state = play([select(0, 1), { type: 'revealLetter' }])
    expect(withAutoMarks(state, solution)).toEqual(state.marks)
    expect(withAutoMarks(state, solution)['0,1']).toBe('helped')
  })

  it('compara a solução sem acento', () => {
    const accented = { ...solution, cells: solution.cells.map((row) => [...row]) }
    accented.cells[0] = ['Ç', 'Ã', 'S', 'A']
    const state = play([select(0, 1), type('a'), select(0, 0), type('ç')])
    expect(withAutoMarks(state, accented)).toEqual({})
  })

  it('ignora letra só no rascunho', () => {
    const state = play([{ type: 'setPencil', on: true }, select(0, 0), type('x')])
    expect(state.draft[0]?.[0]).toBe('X')
    expect(withAutoMarks(state, solution)).toEqual({})
  })

  it('mantém a marca manual e não altera state.marks', () => {
    const state = play([select(0, 0), type('x'), { type: 'verify' }, select(0, 2), type('y')])
    const before = { ...state.marks }
    expect(withAutoMarks(state, solution)).toEqual({ '0,0': 'wrong', '0,2': 'wrong' })
    expect(state.marks).toEqual(before)
  })

  it('ignora bloco', () => {
    const state = play([])
    expect(withAutoMarks(state, solution)).toBe(state.marks)
  })
})
