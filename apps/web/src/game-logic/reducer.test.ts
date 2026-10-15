import { describe, expect, it } from 'vitest'
import { cellsFrom, LAYOUT5, makePuzzle, makeSolution, TINY } from '../test/fixtures'
import { createGame, type GameAction } from './reducer'
import type { GameState } from './state'

function play(rows: string[], actions: GameAction[], from?: (initial: GameState) => GameState) {
  const game = createGame({
    puzzle: makePuzzle(rows),
    solution: makeSolution(rows),
    limits: { letters: 4, words: 2 },
  })
  let state = from ? from(game.initialState) : game.initialState
  for (const action of actions) state = game.reducer(state, action)
  return { state, game }
}

const select = (row: number, col: number): GameAction => ({
  type: 'select',
  position: { row, col },
})
const type = (text: string): GameAction[] =>
  Array.from(text).map((key) => ({ type: 'type', key }) as const)

describe('seleção', () => {
  it('começa na primeira palavra horizontal, direção horizontal', () => {
    const { state } = play(LAYOUT5, [])
    expect(state.selected).toEqual({ row: 0, col: 1 })
    expect(state.direction).toBe('across')
    expect(state.mode).toBe('playing')
    expect(state.completion).toBe('none')
  })

  it('só uma célula fica selecionada por vez', () => {
    const { state } = play(LAYOUT5, [select(2, 2), select(3, 0)])
    expect(state.selected).toEqual({ row: 3, col: 0 })
  })

  it('bloco não é selecionável', () => {
    const { state } = play(LAYOUT5, [select(1, 2)])
    expect(state.selected).toEqual({ row: 0, col: 1 })
  })

  it('clicar de novo na célula selecionada alterna a direção', () => {
    const { state } = play(LAYOUT5, [select(1, 1), select(1, 1)])
    expect(state.direction).toBe('down')
    const again = play(LAYOUT5, [select(1, 1), select(1, 1), select(1, 1)])
    expect(again.state.direction).toBe('across')
  })

  it('não alterna quando a célula só tem palavra numa direção', () => {
    const { state } = play(LAYOUT5, [select(0, 2), select(0, 2)])
    expect(state.direction).toBe('across')
  })

  it('selecionar célula com palavra só na outra direção troca a direção', () => {
    const { state } = play(LAYOUT5, [select(4, 0)])
    expect(state.direction).toBe('down')
  })
})

describe('digitar e apagar', () => {
  it('digitar preenche a célula e avança dentro da palavra', () => {
    const { state } = play(LAYOUT5, type('CA'))
    expect(state.cells[0]?.slice(1, 3)).toEqual(['C', 'A'])
    expect(state.selected).toEqual({ row: 0, col: 3 })
  })

  it('ao completar a palavra o cursor fica na última letra', () => {
    const { state } = play(LAYOUT5, type('CASA'))
    expect(state.cells[0]).toEqual([null, 'C', 'A', 'S', 'A'])
    expect(state.selected).toEqual({ row: 0, col: 4 })
    // digitar de novo no fim troca a letra e continua ali
    const more = play(LAYOUT5, [...type('CASA'), ...type('X')])
    expect(more.state.cells[0]?.[4]).toBe('X')
    expect(more.state.selected).toEqual({ row: 0, col: 4 })
  })

  it('letras acentuadas viram a letra simples e teclas inválidas são ignoradas', () => {
    const { state } = play(LAYOUT5, [
      { type: 'type', key: 'á' },
      { type: 'type', key: '1' },
      { type: 'type', key: 'Shift' },
      { type: 'type', key: 'ç' },
    ])
    expect(state.cells[0]?.slice(1, 3)).toEqual(['A', 'Ç'])
  })

  it('apagar volta uma célula', () => {
    const { state } = play(LAYOUT5, [...type('CA'), { type: 'backspace' }])
    // cursor estava na célula vazia (0,3): volta à (0,2) e apaga o "A"
    expect(state.cells[0]).toEqual([null, 'C', null, null, null])
    expect(state.selected).toEqual({ row: 0, col: 2 })
  })

  it('apagar numa célula com letra apaga e volta uma célula', () => {
    const { state } = play(LAYOUT5, [...type('CASA'), { type: 'backspace' }])
    // cursor no fim, com letra: apaga o "A" final e volta para (0,3)
    expect(state.cells[0]).toEqual([null, 'C', 'A', 'S', null])
    expect(state.selected).toEqual({ row: 0, col: 3 })
  })

  it('apagar na primeira célula da palavra não sai dela', () => {
    const { state } = play(LAYOUT5, [{ type: 'backspace' }])
    expect(state.selected).toEqual({ row: 0, col: 1 })
    const filled = play(LAYOUT5, [...type('C'), select(0, 1), { type: 'backspace' }])
    expect(filled.state.cells[0]?.[1]).toBeNull()
    expect(filled.state.selected).toEqual({ row: 0, col: 1 })
  })

  it('Delete apaga a letra da célula sem mover o cursor', () => {
    const { state } = play(LAYOUT5, [...type('CASA'), select(0, 2), { type: 'delete' }])
    expect(state.cells[0]).toEqual([null, 'C', null, 'S', 'A'])
    expect(state.selected).toEqual({ row: 0, col: 2 })
  })

  it('Delete numa célula vazia não muda nada e não apaga a anterior', () => {
    const before = play(LAYOUT5, type('C'))
    const { state } = play(LAYOUT5, [...type('C'), { type: 'delete' }])
    expect(state).toEqual(before.state)
  })

  it('Delete não apaga célula travada e tira a marca vermelha da que apaga', () => {
    const locked = play(LAYOUT5, [select(0, 2), { type: 'delete' }], (initial) => ({
      ...initial,
      cells: cellsFrom(['.XY..', '.....', '.....', '.....', '.....']),
      locked: initial.locked.map((row, r) => row.map((_, c) => r === 0 && c === 2)),
    }))
    expect(locked.state.cells[0]?.[2]).toBe('Y')
    const wrong = play(LAYOUT5, [select(0, 1), { type: 'delete' }], (initial) => ({
      ...initial,
      cells: cellsFrom(['.X...', '.....', '.....', '.....', '.....']),
      marks: { '0,1': 'wrong' },
    }))
    expect(wrong.state.cells[0]?.[1]).toBeNull()
    expect(wrong.state.marks['0,1']).toBeUndefined()
  })

  it('digita na vertical quando a direção é vertical', () => {
    const { state } = play(LAYOUT5, [select(1, 0), select(1, 0), ...type('MA')])
    expect(state.direction).toBe('down')
    expect(state.cells.map((row) => row[0])).toEqual([null, 'M', 'A', null, null])
    expect(state.selected).toEqual({ row: 3, col: 0 })
  })

  it('não edita célula travada e pula as travadas ao avançar', () => {
    const { state } = play(LAYOUT5, type('C'), (initial) => ({
      ...initial,
      cells: cellsFrom(['.....', '.....', '.....', '.....', '.....']),
      locked: initial.locked.map((row, r) => row.map((_, c) => r === 0 && c === 2)),
    }))
    // a célula (0,2) está travada: depois do "C" em (0,1) o cursor vai direto a (0,3)
    expect(state.selected).toEqual({ row: 0, col: 3 })
    expect(state.cells[0]?.[2]).toBeNull()
    const blocked = play(LAYOUT5, [select(0, 2), ...type('X')], (initial) => ({
      ...initial,
      locked: initial.locked.map((row, r) => row.map((_, c) => r === 0 && c === 2)),
    }))
    expect(blocked.state.cells[0]?.[2]).toBeNull()
  })

  it('marca vermelha corrigida vira roxa; apagar uma célula vermelha tira a marca', () => {
    const marked = (initial: GameState): GameState => ({
      ...initial,
      cells: cellsFrom(['.X...', '.....', '.....', '.....', '.....']),
      marks: { '0,1': 'wrong', '0,2': 'wrong' },
    })
    const corrected = play(LAYOUT5, type('C'), marked)
    expect(corrected.state.marks['0,1']).toBe('helped')
    const erased = play(LAYOUT5, [select(0, 2), { type: 'backspace' }], (initial) => ({
      ...marked(initial),
      cells: cellsFrom(['.XY..', '.....', '.....', '.....', '.....']),
    }))
    expect(erased.state.marks['0,2']).toBeUndefined()
  })
})

describe('setas, Tab e dicas', () => {
  it('as setas movem a seleção pulando blocos', () => {
    const { state } = play(LAYOUT5, [select(1, 1), { type: 'move', arrow: 'ArrowRight' }])
    expect(state.selected).toEqual({ row: 1, col: 3 })
    expect(state.direction).toBe('across')
    const down = play(LAYOUT5, [select(0, 2), { type: 'move', arrow: 'ArrowDown' }])
    expect(down.state.selected).toEqual({ row: 2, col: 2 })
    expect(down.state.direction).toBe('across') // (2,2) só tem palavra horizontal
  })

  it('no limite da grade a seta não faz nada', () => {
    const { state } = play(LAYOUT5, [{ type: 'move', arrow: 'ArrowUp' }])
    expect(state.selected).toEqual({ row: 0, col: 1 })
  })

  it('Home vai à primeira célula da palavra ativa e End à última, na direção atual', () => {
    const start = play(LAYOUT5, [select(0, 3), { type: 'wordStart' }])
    expect(start.state.selected).toEqual({ row: 0, col: 1 })
    expect(start.state.direction).toBe('across')
    const end = play(LAYOUT5, [select(0, 2), { type: 'wordEnd' }])
    expect(end.state.selected).toEqual({ row: 0, col: 4 })
    // na vertical: a palavra de (1,0) para baixo vai de (1,0) a (4,0)
    const down = play(LAYOUT5, [select(2, 0), select(2, 0), { type: 'wordEnd' }])
    expect(down.state.direction).toBe('down')
    expect(down.state.selected).toEqual({ row: 4, col: 0 })
    const up = play(LAYOUT5, [select(3, 0), select(3, 0), { type: 'wordStart' }])
    expect(up.state.selected).toEqual({ row: 1, col: 0 })
  })

  it('Tab vai à próxima palavra e Shift+Tab à anterior, em ordem circular', () => {
    const next = play(LAYOUT5, [{ type: 'nextWord' }])
    expect(next.state.selected).toEqual({ row: 1, col: 0 }) // 4 horizontal (MO)
    expect(next.state.direction).toBe('across')
    const back = play(LAYOUT5, [{ type: 'previousWord' }])
    expect(back.state.direction).toBe('down') // dá a volta: última palavra, 4 vertical
    expect(back.state.selected).toEqual({ row: 1, col: 0 })
  })

  it('clicar numa dica seleciona a palavra, na primeira célula vazia', () => {
    const { state } = play(LAYOUT5, [{ type: 'selectWord', number: 6, direction: 'across' }])
    expect(state.selected).toEqual({ row: 2, col: 0 })
    expect(state.direction).toBe('across')
    const half = play(LAYOUT5, [
      select(2, 0),
      ...type('AR'),
      { type: 'selectWord', number: 1, direction: 'across' },
      { type: 'selectWord', number: 6, direction: 'across' },
    ])
    expect(half.state.selected).toEqual({ row: 2, col: 2 })
  })

  it('dica inexistente não muda nada', () => {
    const { state } = play(LAYOUT5, [{ type: 'selectWord', number: 99, direction: 'down' }])
    expect(state.selected).toEqual({ row: 0, col: 1 })
  })
})

describe('conclusão', () => {
  const solve: GameAction[] = [
    ...type('CAL'),
    select(1, 0),
    ...type('A'),
    select(1, 2),
    ...type('O'),
    { type: 'selectWord', number: 3, direction: 'across' },
    ...type('SO'),
  ]

  it('grade completa e correta passa a modo leitura, pendente de confirmação, na mesma ação', () => {
    const almost = play(TINY, solve)
    expect(almost.state.mode).toBe('playing')
    const { state } = play(TINY, [...solve, ...type('L')])
    expect(state.mode).toBe('completed')
    expect(state.completion).toBe('pending')
    expect(state.selected).toBeNull()
  })

  it('grade completa e errada não muda nada', () => {
    const { state } = play(TINY, [...solve, ...type('X')])
    expect(state.mode).toBe('playing')
    expect(state.completion).toBe('none')
    expect(state.selected).not.toBeNull()
  })

  it('em modo leitura as ações de jogo são ignoradas', () => {
    const { state } = play(TINY, [
      ...solve,
      ...type('L'),
      select(0, 0),
      ...type('Z'),
      { type: 'backspace' },
      { type: 'move', arrow: 'ArrowRight' },
      { type: 'nextWord' },
    ])
    expect(state.mode).toBe('completed')
    expect(state.cells[0]).toEqual(['C', 'A', 'L'])
    expect(state.selected).toBeNull()
  })

  it('confirmCompletion confirma só quando está pendente', () => {
    const done = play(TINY, [...solve, ...type('L'), { type: 'confirmCompletion' }])
    expect(done.state.completion).toBe('confirmed')
    const none = play(TINY, [{ type: 'confirmCompletion' }])
    expect(none.state.completion).toBe('none')
  })
})

describe('dados do servidor e reinício', () => {
  it('hydrate restaura as letras e as ajudas guardadas', () => {
    const { state } = play(LAYOUT5, [
      {
        type: 'hydrate',
        cells: cellsFrom(['#CA..', '.....', '.....', '.....', '.....']),
        help: { usage: { letters: 1, words: 0 }, marks: { '0,2': 'helped' }, locked: ['0,2'] },
      },
    ])
    expect(state.cells[0]).toEqual([null, 'C', 'A', null, null])
    expect(state.usage).toEqual({ letters: 1, words: 0 })
    expect(state.marks).toEqual({ '0,2': 'helped' })
    expect(state.locked[0]?.[2]).toBe(true)
    expect(state.locked[0]?.[1]).toBe(false)
  })

  it('hydrate com dimensões erradas é ignorado', () => {
    const { state, game } = play(LAYOUT5, [{ type: 'hydrate', cells: [[null]] }])
    expect(state).toEqual(game.initialState)
  })

  it('markElsewhere só liga o aviso e não tira a edição', () => {
    const { state } = play(LAYOUT5, [{ type: 'markElsewhere' }, ...type('C')])
    expect(state.elsewhere).toBe(true)
    expect(state.mode).toBe('playing')
    expect(state.cells[0]?.[1]).toBe('C')
  })

  it('viewServerProgress passa ao modo leitura com as letras do servidor', () => {
    const { state } = play(TINY, [
      ...type('C'),
      { type: 'markElsewhere' },
      { type: 'viewServerProgress', cells: cellsFrom(TINY) },
    ])
    expect(state.mode).toBe('completed')
    expect(state.completion).toBe('confirmed')
    expect(state.elsewhere).toBe(false)
    expect(state.cells).toEqual(cellsFrom(TINY))
    expect(state.selected).toBeNull()
  })

  it('reset volta ao jogo vazio', () => {
    const { state, game } = play(TINY, [
      ...type('CAL'),
      { type: 'markElsewhere' },
      { type: 'reset' },
    ])
    expect(state).toEqual(game.initialState)
  })
})
