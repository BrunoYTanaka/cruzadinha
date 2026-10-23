import { describe, expect, it } from 'vitest'
import { makeNeighbourPuzzle, makeSolution, NEIGHBOURS } from '../test/fixtures'
import { activeWord } from './navigation'
import { createGame, type GameAction } from './reducer'

// Palavras vizinhas coladas sem bloco entre elas (feature 030, FR-017).
function play(actions: GameAction[]) {
  const game = createGame({
    puzzle: makeNeighbourPuzzle(),
    solution: makeSolution(NEIGHBOURS),
    limits: { letters: 4, words: 2 },
  })
  const state = actions.reduce(game.reducer, game.initialState)
  return { state, game }
}

const select = (row: number, col: number): GameAction => ({
  type: 'select',
  position: { row, col },
})
const type = (text: string): GameAction[] =>
  Array.from(text).map((key) => ({ type: 'type', key }) as const)

describe('palavras vizinhas', () => {
  it('começa na primeira palavra horizontal', () => {
    const { state, game } = play([])
    expect(state.selected).toEqual({ row: 0, col: 0 })
    expect(activeWord(game.index, state.selected, state.direction)?.number).toBe(1)
  })

  it('digitar a última letra da palavra não passa para a vizinha', () => {
    const { state } = play(type('AB'))
    expect(state.selected).toEqual({ row: 0, col: 1 })
    expect(state.cells[0]).toEqual(['A', 'B', null, null])
  })

  it('digitar mais uma letra no fim da palavra troca a letra, sem avançar', () => {
    const { state } = play(type('ABX'))
    expect(state.selected).toEqual({ row: 0, col: 1 })
    expect(state.cells[0]).toEqual(['A', 'X', null, null])
  })

  it('Home e End vão às pontas da palavra ativa, não da linha', () => {
    const start = play([select(0, 3), { type: 'wordStart' }])
    expect(start.state.selected).toEqual({ row: 0, col: 2 })
    const end = play([select(0, 2), { type: 'wordEnd' }])
    expect(end.state.selected).toEqual({ row: 0, col: 3 })
    const first = play([select(0, 1), { type: 'wordStart' }])
    expect(first.state.selected).toEqual({ row: 0, col: 0 })
  })

  it('Delete limpa a letra e o cursor fica onde está', () => {
    const { state } = play([...type('AB'), { type: 'delete' }])
    expect(state.cells[0]).toEqual(['A', null, null, null])
    expect(state.selected).toEqual({ row: 0, col: 1 })
  })

  it('Backspace no começo da palavra não apaga a letra da vizinha', () => {
    const { state } = play([...type('AB'), select(0, 2), { type: 'backspace' }])
    expect(state.cells[0]).toEqual(['A', 'B', null, null])
    expect(state.selected).toEqual({ row: 0, col: 2 })
  })

  it('Tab percorre as palavras na ordem e entra na primeira célula vazia', () => {
    const { state, game } = play([{ type: 'nextWord' }])
    expect(state.selected).toEqual({ row: 0, col: 2 })
    expect(activeWord(game.index, state.selected, state.direction)).toMatchObject({
      number: 3,
      direction: 'across',
    })
    const back = play([{ type: 'nextWord' }, { type: 'previousWord' }])
    expect(back.state.selected).toEqual({ row: 0, col: 0 })
  })

  it('a seta anda uma célula e a palavra ativa passa a ser a da nova célula', () => {
    const { state, game } = play([select(0, 1), { type: 'move', arrow: 'ArrowRight' }])
    expect(state.selected).toEqual({ row: 0, col: 2 })
    expect(state.direction).toBe('across')
    expect(activeWord(game.index, state.selected, state.direction)?.number).toBe(3)
  })

  it('revelar a palavra revela só as células dela', () => {
    const { state } = play([{ type: 'revealWord' }])
    expect(state.cells[0]).toEqual(['A', 'B', null, null])
  })

  it('completa quando toda a grade fica certa', () => {
    const { state } = play([
      ...type('AB'),
      select(0, 2),
      ...type('CD'),
      select(1, 0),
      ...type('EF'),
      select(1, 2),
      ...type('GH'),
      select(2, 0),
      ...type('IJKL'),
    ])
    expect(state.mode).toBe('completed')
    expect(state.completion).toBe('pending')
  })
})
