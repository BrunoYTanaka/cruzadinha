import {
  difficultyTitle,
  puzzleSchema,
  puzzleSourceNames,
  validatePuzzleWithSolution,
  type Cell,
  type Difficulty,
  type Puzzle,
  type PuzzleSourceId,
  type Solution,
  type Word,
} from '@cruzadinha/shared'
import type { FilledGrid } from './fill'

// Feature 065: PRNG determinístico e conversão da grade preenchida no formato interno.

// PRNG pequeno e determinístico (mulberry32): mesma semente, mesma grade.
export function seededRandom(seed: number): () => number {
  let state = seed >>> 0
  return () => {
    state = (state + 0x6d2b79f5) >>> 0
    let t = state
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

// Semente a partir de um texto (ex.: a data e a tentativa).
export function seedFrom(text: string): number {
  let hash = 2166136261
  for (const char of text) hash = Math.imul(hash ^ char.codePointAt(0)!, 16777619)
  return hash >>> 0
}

export type GeneratedPuzzle = { puzzle: Puzzle; solution: Solution }

/**
 * Converte a grade preenchida e as dicas (uma por corrida, na ordem de `grid.slots`) no formato
 * interno, conferido pelas mesmas regras de qualquer puzzle. A solução leva letras sem acento.
 */
export function toPuzzle(
  grid: FilledGrid,
  clues: readonly string[],
  options: { source: PuzzleSourceId; date: string; difficulty: Difficulty },
): GeneratedPuzzle | null {
  const size = grid.template.size
  const letters = Array.from({ length: size }, () => Array<string | null>(size).fill(null))
  grid.slots.forEach((slot, i) => {
    slot.cells.forEach(([r, c], pos) => {
      letters[r]![c] = grid.words[i]!.plain[pos]!
    })
  })
  const numbers = new Map<string, number>()
  let next = 1
  for (let r = 0; r < size; r++) {
    for (let c = 0; c < size; c++) {
      if (grid.slots.some((s) => s.row === r && s.col === c)) numbers.set(`${r}:${c}`, next++)
    }
  }
  const cells: Cell[][] = letters.map((line, r) =>
    line.map((letter, c): Cell =>
      letter === null
        ? { kind: 'block' }
        : { kind: 'open', number: numbers.get(`${r}:${c}`) ?? null },
    ),
  )
  const words: Word[] = grid.slots
    .map((slot, i) => ({
      number: numbers.get(`${slot.row}:${slot.col}`)!,
      direction: slot.direction,
      row: slot.row,
      col: slot.col,
      length: slot.length,
      clue: clues[i]!,
    }))
    .sort((a, b) =>
      a.direction === b.direction ? a.number - b.number : a.direction === 'across' ? -1 : 1,
    )
  const candidate = {
    source: options.source,
    level: 'daily' as const,
    date: options.date,
    attribution: {
      sourceName: puzzleSourceNames[options.source],
      title: difficultyTitle(options.difficulty),
      author: null,
      copyright: null,
    },
    grid: { width: size, height: size, cells },
    words,
  }
  const parsed = puzzleSchema.safeParse(candidate)
  if (!parsed.success) return null
  const solution: Solution = { cells: letters }
  return validatePuzzleWithSolution(parsed.data, solution).success
    ? { puzzle: parsed.data, solution }
    : null
}
