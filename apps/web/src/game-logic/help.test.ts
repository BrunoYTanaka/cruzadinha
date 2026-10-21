import { describe, expect, it } from 'vitest'
import { makePuzzle, makeSolution } from '../test/fixtures'
import { canRevealLetter, canRevealWord } from './help'
import { createGame, type GameAction } from './reducer'
import type { GameLimits, GameState } from './state'

const ROWS = ['CASA', 'A#O#', 'MOLA']

function play(actions: GameAction[], limits: GameLimits = { letters: 2, words: 1 }) {
  const game = createGame({
    puzzle: makePuzzle(ROWS),
    solution: makeSolution(ROWS),
    limits,
  })
  let state: GameState = game.initialState
  for (const action of actions) state = game.reducer(state, action)
  return { state, game }
}

const select = (row: number, col: number): GameAction => ({
  type: 'select',
  position: { row, col },
})
const type = (text: string): GameAction[] =>
  Array.from(text).map((key) => ({ type: 'type', key }) as const)

describe('revelar letra', () => {
  it('preenche a selecionada, trava, marca em roxo e consome 1', () => {
    const { state } = play([select(0, 1), { type: 'revealLetter' }])
    expect(state.cells[0]?.[1]).toBe('A')
    expect(state.locked[0]?.[1]).toBe(true)
    expect(state.marks['0,1']).toBe('helped')
    expect(state.usage.letters).toBe(1)
    expect(state.selected).toEqual({ row: 0, col: 1 })
    expect(state.lastHelp).toMatchObject({ kind: 'letter', count: 1 })
  })

  it('não gasta o limite se a célula já está correta', () => {
    const { state } = play([select(0, 0), ...type('C'), select(0, 0), { type: 'revealLetter' }])
    expect(state.usage.letters).toBe(0)
    expect(state.locked[0]?.[0]).toBe(false)
    expect(state.lastHelp?.kind).toBe('nothing')
  })

  it('corrige uma letra errada e passa a respeitar o limite', () => {
    const { state } = play([
      select(0, 0),
      ...type('X'),
      select(0, 0),
      { type: 'revealLetter' },
      select(0, 1),
      { type: 'revealLetter' },
      select(0, 2),
      { type: 'revealLetter' },
    ])
    expect(state.cells[0]?.slice(0, 2)).toEqual(['C', 'A'])
    expect(state.cells[0]?.[2]).toBeNull()
    expect(state.usage.letters).toBe(2)
    expect(state.lastHelp?.kind).toBe('letter-limit')
    expect(canRevealLetter(state, { letters: 2, words: 1 })).toBe(false)
  })

  it('célula travada não aceita digitar nem apagar', () => {
    const { state } = play([
      select(0, 1),
      { type: 'revealLetter' },
      ...type('Z'),
      { type: 'backspace' },
    ])
    expect(state.cells[0]?.[1]).toBe('A')
  })
})

describe('revelar palavra', () => {
  it('preenche e trava a palavra ativa e consome 1', () => {
    const { state } = play([select(0, 1), select(0, 0), { type: 'revealWord' }])
    expect(state.cells[0]).toEqual(['C', 'A', 'S', 'A'])
    expect(state.locked[0]).toEqual([true, true, true, true])
    expect(state.usage.words).toBe(1)
    expect(state.lastHelp).toMatchObject({ kind: 'word', count: 4 })
  })

  it('conta só as células que mudaram e respeita o limite', () => {
    const { state } = play([
      select(0, 0),
      ...type('CA'),
      select(0, 0),
      { type: 'revealWord' },
      select(2, 0),
      { type: 'revealWord' },
    ])
    expect(state.lastHelp?.kind).toBe('word-limit')
    expect(state.usage.words).toBe(1)
    expect(canRevealWord(state, { letters: 2, words: 1 })).toBe(false)
  })

  it('não gasta o limite se a palavra já estava toda certa', () => {
    const { state } = play([...type('CASA'), select(0, 0), { type: 'revealWord' }])
    expect(state.usage.words).toBe(0)
    expect(state.lastHelp?.kind).toBe('nothing')
    expect(state.marks['0,0']).toBe('helped')
  })

  it('completa a cruzada quando a última palavra é revelada', () => {
    const { state } = play(
      [
        select(0, 1),
        select(0, 0),
        { type: 'revealWord' },
        select(2, 0),
        { type: 'revealWord' },
        select(1, 0),
        ...type('A'),
        select(1, 2),
        ...type('O'),
      ],
      { letters: 2, words: 2 },
    )
    expect(state.mode).toBe('completed')
    expect(state.completion).toBe('pending')
  })
})

describe('verificar', () => {
  it('marca certas em roxo e erradas em vermelho, vazias sem marca', () => {
    const { state } = play([...type('CX'), { type: 'verify' }])
    expect(state.marks['0,0']).toBe('helped')
    expect(state.marks['0,1']).toBe('wrong')
    expect(state.marks['0,2']).toBeUndefined()
    expect(state.lastHelp).toMatchObject({ kind: 'verify', count: 1 })
  })

  it('sem letras digitadas não faz nada e não muda a seleção', () => {
    const { state, game } = play([{ type: 'verify' }])
    expect(state.marks).toEqual({})
    expect(state.lastHelp?.kind).toBe('nothing')
    expect(state.selected).toEqual(game.initialState.selected)
  })

  it('é ilimitado', () => {
    const { state } = play([select(0, 0), ...type('X'), ...Array(5).fill({ type: 'verify' })])
    expect(state.lastHelp?.kind).toBe('verify')
  })

  it('corrigir uma letra vermelha a torna roxa', () => {
    const { state } = play([
      select(0, 0),
      ...type('X'),
      { type: 'verify' },
      select(0, 0),
      ...type('C'),
    ])
    expect(state.marks['0,0']).toBe('helped')
  })
})

describe('solução com letras acentuadas (a fonte traz Ã, É...)', () => {
  const ACCENTED = ['CÃO', 'A#R']
  const game = createGame({
    puzzle: makePuzzle(ACCENTED),
    solution: makeSolution(ACCENTED),
    limits: { letters: 2, words: 1 },
  })

  it('digitar a letra simples conta como certa e conclui a grade', () => {
    let state: GameState = game.initialState
    const actions: GameAction[] = [
      ...type('CAO'),
      select(1, 0),
      ...type('A'),
      select(1, 2),
      ...type('R'),
    ]
    for (const action of actions) state = game.reducer(state, action)
    expect(state.mode).toBe('completed')
    expect(state.completion).toBe('pending')
  })

  it('verificar não marca a letra simples como errada', () => {
    let state: GameState = game.initialState
    for (const key of 'CA') state = game.reducer(state, { type: 'type', key })
    state = game.reducer(state, { type: 'verify' })
    expect(state.marks['0,1']).toBe('helped')
  })

  it('revelar letra coloca a letra simples', () => {
    let state: GameState = game.initialState
    state = game.reducer(state, { type: 'select', position: { row: 0, col: 1 } })
    state = game.reducer(state, { type: 'revealLetter' })
    expect(state.cells[0]?.[1]).toBe('A')
  })
})

describe('limites configuráveis (feature 021)', () => {
  it('limite null nunca esgota', () => {
    const many = { usage: { letters: 98, words: 50 } } as GameState
    expect(canRevealLetter(many, { letters: null, words: null })).toBe(true)
    expect(canRevealWord(many, { letters: null, words: null })).toBe(true)
  })

  it('limite numérico compara com o uso', () => {
    const used = { usage: { letters: 3, words: 1 } } as GameState
    expect(canRevealLetter(used, { letters: 4, words: 1 })).toBe(true)
    expect(canRevealWord(used, { letters: 4, words: 1 })).toBe(false)
  })

  it('usa os limites recebidos no pedido em vez dos do início da partida', () => {
    const { state } = play(
      [
        select(0, 0),
        { type: 'revealLetter', limits: { letters: null, words: 1 } },
        select(0, 1),
        { type: 'revealLetter', limits: { letters: null, words: 1 } },
        select(0, 2),
        { type: 'revealLetter', limits: { letters: null, words: 1 } },
      ],
      { letters: 1, words: 1 },
    )
    expect(state.usage.letters).toBe(3)
    expect(state.lastHelp?.kind).toBe('letter')
  })

  it('baixar o limite abaixo do uso não desfaz nada e esgota a ajuda', () => {
    const { state, game } = play([
      select(0, 0),
      { type: 'revealLetter', limits: { letters: 6, words: 2 } },
      select(0, 1),
      { type: 'revealLetter', limits: { letters: 6, words: 2 } },
      select(0, 2),
      { type: 'revealLetter', limits: { letters: 6, words: 2 } },
    ])
    const after = game.reducer(game.reducer(state, select(0, 3)), {
      type: 'revealLetter',
      limits: { letters: 2, words: 2 },
    })
    expect(after.usage.letters).toBe(3)
    expect(after.cells[0]?.slice(0, 3)).toEqual(['C', 'A', 'S'])
    expect(after.locked[0]?.slice(0, 3)).toEqual([true, true, true])
    expect(after.marks['0,0']).toBe('helped')
    expect(after.cells[0]?.[3]).toBeNull()
    expect(after.lastHelp?.kind).toBe('letter-limit')
  })

  it('revelar palavra também respeita o limite do pedido', () => {
    const { state } = play(
      [select(0, 0), { type: 'revealWord', limits: { letters: 0, words: 0 } }],
      { letters: 2, words: 5 },
    )
    expect(state.usage.words).toBe(0)
    expect(state.lastHelp?.kind).toBe('word-limit')
  })
})
