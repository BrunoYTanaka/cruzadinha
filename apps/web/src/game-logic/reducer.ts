import type { Puzzle, Solution } from '@cruzadinha/shared'
import { isSolved } from './completion'
import { revealLetter, revealWord, verify } from './help'
import { normalizeLetter } from './letters'
import {
  activeWord,
  arrowDirection,
  buildIndex,
  directionAt,
  entryCell,
  findWord,
  moveBy,
  nextCellInWord,
  otherDirection,
  previousCellInWord,
  samePosition,
  stepWord,
  type Arrow,
  type PuzzleIndex,
} from './navigation'
import {
  cellKey,
  createInitialState,
  emptyCells,
  emptyLocks,
  initialSelection,
  type Direction,
  type GameLimits,
  type GameState,
  type HelpMark,
  type Position,
} from './state'

// O que o aparelho guarda sobre as ajudas (data-model.md, seção 2).
export type HelpSnapshot = {
  usage: { letters: number; words: number }
  marks: Record<string, HelpMark>
  locked: string[]
}

export type GameAction =
  | { type: 'select'; position: Position }
  | { type: 'toggleDirection' }
  | { type: 'type'; key: string }
  | { type: 'backspace' }
  | { type: 'delete' }
  | { type: 'move'; arrow: Arrow }
  | { type: 'wordStart' }
  | { type: 'wordEnd' }
  | { type: 'nextWord' }
  | { type: 'previousWord' }
  | { type: 'selectWord'; number: number; direction: Direction }
  | { type: 'revealLetter' }
  | { type: 'revealWord' }
  | { type: 'verify' }
  | { type: 'hydrate'; cells: (string | null)[][]; help?: HelpSnapshot | null }
  | { type: 'confirmCompletion' }
  | { type: 'markElsewhere' }
  | { type: 'viewServerProgress'; cells: (string | null)[][] }
  | { type: 'reset' }

export type GameContext = { puzzle: Puzzle; solution: Solution; limits: GameLimits }

export type Game = {
  index: PuzzleIndex
  initialState: GameState
  reducer: (state: GameState, action: GameAction) => GameState
}

function sameShape(puzzle: Puzzle, cells: (string | null)[][]): boolean {
  return (
    cells.length === puzzle.grid.height && cells.every((row) => row.length === puzzle.grid.width)
  )
}

function withCell<T>(grid: T[][], { row, col }: Position, value: T): T[][] {
  return grid.map((line, r) =>
    r === row ? line.map((cell, c) => (c === col ? value : cell)) : line,
  )
}

function withoutMark(marks: GameState['marks'], position: Position): GameState['marks'] {
  const key = cellKey(position)
  if (!(key in marks)) return marks
  const next = { ...marks }
  delete next[key]
  return next
}

// Cria o jogo de um puzzle: o reducer já carrega a solução para decidir a conclusão sozinho.
export function createGame({ puzzle, solution, limits }: GameContext): Game {
  const index = buildIndex(puzzle)
  const initialState = createInitialState(puzzle)

  // Depois de cada edição: se a grade ficou certa, passa a modo leitura (pendente de confirmação).
  function finish(state: GameState): GameState {
    if (state.mode !== 'playing' || !isSolved(state.cells, solution)) return state
    return { ...state, mode: 'completed', completion: 'pending', selected: null }
  }

  function reducer(state: GameState, action: GameAction): GameState {
    switch (action.type) {
      case 'hydrate': {
        if (!sameShape(puzzle, action.cells)) return state
        const help = action.help
        return finish({
          ...state,
          cells: action.cells,
          usage: help?.usage ?? state.usage,
          marks: help?.marks ?? state.marks,
          locked: help
            ? emptyLocks(puzzle).map((line, row) =>
                line.map((_, col) => help.locked.includes(cellKey({ row, col }))),
              )
            : state.locked,
        })
      }
      case 'confirmCompletion':
        return state.completion === 'pending' ? { ...state, completion: 'confirmed' } : state
      case 'markElsewhere':
        return state.elsewhere ? state : { ...state, elsewhere: true }
      case 'viewServerProgress': {
        if (!sameShape(puzzle, action.cells)) return state
        return {
          ...state,
          cells: action.cells,
          selected: null,
          mode: 'completed',
          completion: 'confirmed',
          elsewhere: false,
        }
      }
      case 'reset': {
        const { selected, direction } = initialSelection(puzzle)
        return {
          ...state,
          cells: emptyCells(puzzle),
          selected,
          direction,
          locked: emptyLocks(puzzle),
          marks: {},
          usage: { letters: 0, words: 0 },
          lastHelp: null,
          mode: 'playing',
          completion: 'none',
          elsewhere: false,
        }
      }
    }

    // Daqui em diante são ações de jogo: em modo leitura não mudam nada.
    if (state.mode !== 'playing') return state

    switch (action.type) {
      case 'revealLetter':
        return finish(revealLetter(state, solution, limits))
      case 'revealWord':
        return finish(revealWord(state, index, solution, limits))
      case 'verify':
        return verify(state, solution)
      case 'select': {
        const { position } = action
        if (!index.isOpen(position)) return state
        if (samePosition(state.selected, position)) {
          return reducer(state, { type: 'toggleDirection' })
        }
        return {
          ...state,
          selected: position,
          direction: directionAt(index, position, state.direction),
        }
      }
      case 'toggleDirection': {
        if (!state.selected) return state
        const other = otherDirection(state.direction)
        return index.wordAt(state.selected, other) ? { ...state, direction: other } : state
      }
      case 'type': {
        const letter = normalizeLetter(action.key)
        const at = state.selected
        if (!letter || !at) return state
        if (state.locked[at.row]?.[at.col]) return state
        const wasWrong = state.marks[cellKey(at)] === 'wrong'
        const filled: GameState = {
          ...state,
          cells: withCell(state.cells, at, letter),
          marks: wasWrong ? { ...state.marks, [cellKey(at)]: 'helped' } : state.marks,
        }
        // Avança para a próxima célula da palavra que não seja travada; no fim da palavra o
        // cursor fica na última letra.
        let next = nextCellInWord(index, at, state.direction)
        while (next && filled.locked[next.row]?.[next.col]) {
          next = nextCellInWord(index, next, state.direction)
        }
        return finish(next ? { ...filled, selected: next } : filled)
      }
      case 'backspace': {
        const at = state.selected
        if (!at) return state
        const hasLetter = state.cells[at.row]?.[at.col] != null && !state.locked[at.row]?.[at.col]
        const previous = previousCellInWord(index, at, state.direction)
        if (hasLetter) {
          return {
            ...state,
            cells: withCell(state.cells, at, null),
            marks:
              state.marks[cellKey(at)] === 'wrong' ? withoutMark(state.marks, at) : state.marks,
            selected: previous ?? at,
          }
        }
        if (!previous) return state
        const erasable =
          state.cells[previous.row]?.[previous.col] != null &&
          !state.locked[previous.row]?.[previous.col]
        return {
          ...state,
          cells: erasable ? withCell(state.cells, previous, null) : state.cells,
          marks:
            erasable && state.marks[cellKey(previous)] === 'wrong'
              ? withoutMark(state.marks, previous)
              : state.marks,
          selected: previous,
        }
      }
      // Delete: apaga a letra da célula selecionada e o cursor fica onde está.
      case 'delete': {
        const at = state.selected
        if (!at || state.cells[at.row]?.[at.col] == null || state.locked[at.row]?.[at.col]) {
          return state
        }
        return {
          ...state,
          cells: withCell(state.cells, at, null),
          marks: state.marks[cellKey(at)] === 'wrong' ? withoutMark(state.marks, at) : state.marks,
        }
      }
      // Home e End: primeira e última célula da palavra ativa, sem mudar a direção.
      case 'wordStart':
      case 'wordEnd': {
        const word = activeWord(index, state.selected, state.direction)
        if (!word) return state
        const cells = index.cellsOf(word)
        const target = action.type === 'wordStart' ? cells[0] : cells[cells.length - 1]
        return target ? { ...state, selected: target } : state
      }
      case 'move': {
        if (!state.selected) return state
        const target = moveBy(index, state.selected, action.arrow)
        if (!target) return state
        return {
          ...state,
          selected: target,
          direction: directionAt(index, target, arrowDirection(action.arrow)),
        }
      }
      case 'nextWord':
      case 'previousWord': {
        const current = activeWord(index, state.selected, state.direction)
        const word = stepWord(index, current, action.type === 'nextWord' ? 1 : -1)
        if (!word) return state
        return {
          ...state,
          selected: entryCell(index, word, state.cells),
          direction: word.direction,
        }
      }
      case 'selectWord': {
        const word = findWord(index, action.number, action.direction)
        if (!word) return state
        return {
          ...state,
          selected: entryCell(index, word, state.cells),
          direction: word.direction,
        }
      }
    }
  }

  return { index, initialState, reducer }
}
