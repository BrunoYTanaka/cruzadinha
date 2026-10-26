import type { Solution } from '@cruzadinha/shared'
import type { PuzzleIndex } from './navigation'
import { plainLetter } from './letters'
import { activeWord } from './navigation'
import { cellKey, type GameLimits, type GameState, type HelpResult, type Position } from './state'

// Letra esperada na célula, sem acento (a solução da fonte pode trazer Ã, É...).
const expectedAt = (solution: Solution, { row, col }: Position): string | null => {
  const letter = solution.cells[row]?.[col]
  return letter ? plainLetter(letter) : null
}

function withResult(
  state: GameState,
  kind: HelpResult['kind'],
  count: number,
  patch: Partial<GameState> = {},
): GameState {
  return {
    ...state,
    ...patch,
    lastHelp: { seq: (state.lastHelp?.seq ?? 0) + 1, kind, count },
  }
}

// Reduzir o limite abaixo do uso só esgota a ajuda; nada já revelado é desfeito (FR-009).
const withinLimit = (used: number, limit: number | null) => limit === null || used < limit

export function canRevealLetter(state: GameState, limits: GameLimits): boolean {
  return withinLimit(state.usage.letters, limits.letters)
}

export function canRevealWord(state: GameState, limits: GameLimits): boolean {
  return withinLimit(state.usage.words, limits.words)
}

// Troca uma célula: letra certa, travada e com a marca de ajuda (roxa).
function reveal(
  cells: (string | null)[][],
  locked: boolean[][],
  marks: GameState['marks'],
  position: Position,
  letter: string,
) {
  return {
    cells: cells.map((line, r) =>
      r === position.row ? line.map((cell, c) => (c === position.col ? letter : cell)) : line,
    ),
    locked: locked.map((line, r) =>
      r === position.row ? line.map((cell, c) => (c === position.col ? true : cell)) : line,
    ),
    marks: { ...marks, [cellKey(position)]: 'helped' as const },
  }
}

// Revela a célula selecionada, se ainda não estiver correta. Consome 1 do limite.
export function revealLetter(state: GameState, solution: Solution, limits: GameLimits): GameState {
  if (!canRevealLetter(state, limits)) return withResult(state, 'letter-limit', 0)
  const at = state.selected
  const letter = at ? expectedAt(solution, at) : null
  if (!at || !letter || state.cells[at.row]?.[at.col] === letter) {
    return withResult(state, 'nothing', 0)
  }
  const next = reveal(state.cells, state.locked, state.marks, at, letter)
  return withResult(state, 'letter', 1, {
    ...next,
    usage: { ...state.usage, letters: state.usage.letters + 1 },
  })
}

// Preenche e trava as células ainda não corretas da palavra ativa. Só consome 1 se mudar algo.
export function revealWord(
  state: GameState,
  index: PuzzleIndex,
  solution: Solution,
  limits: GameLimits,
): GameState {
  if (!canRevealWord(state, limits)) return withResult(state, 'word-limit', 0)
  const word = activeWord(index, state.selected, state.direction)
  if (!word) return withResult(state, 'nothing', 0)
  let { cells, locked, marks } = state
  let changed = 0
  for (const position of index.cellsOf(word)) {
    const letter = expectedAt(solution, position)
    if (!letter) continue
    const correct = cells[position.row]?.[position.col] === letter
    if (correct && locked[position.row]?.[position.col]) continue
    if (!correct) changed += 1
    ;({ cells, locked, marks } = reveal(cells, locked, marks, position, letter))
  }
  if (changed === 0) {
    // Tudo já estava certo: as células certas ganham a marca, mas o limite não é gasto.
    return withResult(state, 'nothing', 0, { cells, locked, marks })
  }
  return withResult(state, 'word', changed, {
    cells,
    locked,
    marks,
    usage: { ...state.usage, words: state.usage.words + 1 },
  })
}

// Confere a grade inteira: certas ficam roxas, erradas vermelhas, vazias sem marca.
export function verify(state: GameState, solution: Solution): GameState {
  const marks = { ...state.marks }
  let typed = 0
  let wrong = 0
  state.cells.forEach((line, row) =>
    line.forEach((value, col) => {
      const expected = expectedAt(solution, { row, col })
      if (!expected || value == null) return
      typed += 1
      const key = cellKey({ row, col })
      if (value === expected) {
        marks[key] = 'helped'
      } else {
        marks[key] = 'wrong'
        wrong += 1
      }
    }),
  )
  if (typed === 0) return withResult(state, 'nothing', 0)
  return withResult(state, 'verify', wrong, { marks })
}
