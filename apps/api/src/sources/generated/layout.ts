import {
  difficultyLabels,
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

// Feature 064: o modelo só manda palavras e dicas; esta montagem pura põe as palavras numa grade
// N x N de palavras cruzadas livres (research R1, R2). Cada palavra nova cruza uma já posta numa
// letra idêntica e não encosta em nenhuma outra letra, então os cruzamentos são coerentes por
// construção e toda corrida de casas abertas é exatamente uma palavra.

export type ValidWord = { answer: string; clue: string }
export type Direction = 'across' | 'down'
export type Placement = ValidWord & { row: number; col: number; direction: Direction }

const ATTEMPTS = 200

// Mínimo de palavras para aceitar a grade: 9 → 11, 11 → 14, 13 → 16, 15 → 19.
export const minWords = (size: number) => Math.round(1.25 * size)

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

type Board = {
  size: number
  letters: (string | null)[][]
  // Direções que já ocupam cada casa, para duas palavras da mesma direção nunca se sobreporem.
  used: Set<string>[][]
}

const emptyBoard = (size: number): Board => ({
  size,
  letters: Array.from({ length: size }, () => Array<string | null>(size).fill(null)),
  used: Array.from({ length: size }, () => Array.from({ length: size }, () => new Set<string>())),
})

const cellAt = (dir: Direction, row: number, col: number, i: number) =>
  dir === 'across' ? { r: row, c: col + i } : { r: row + i, c: col }

// Quantos cruzamentos a palavra faria nesta posição, ou -1 se a posição não serve.
function crossings(board: Board, letters: string[], row: number, col: number, dir: Direction) {
  const { size } = board
  const length = letters.length
  const end = cellAt(dir, row, col, length - 1)
  if (row < 0 || col < 0 || end.r >= size || end.c >= size) return -1
  const at = (r: number, c: number) =>
    r < 0 || c < 0 || r >= size || c >= size ? null : board.letters[r]![c]!
  const before = cellAt(dir, row, col, -1)
  const after = cellAt(dir, row, col, length)
  if (at(before.r, before.c) !== null || at(after.r, after.c) !== null) return -1
  let count = 0
  for (let i = 0; i < length; i++) {
    const { r, c } = cellAt(dir, row, col, i)
    const existing = board.letters[r]![c]!
    if (existing !== null) {
      if (existing !== letters[i] || board.used[r]![c]!.has(dir)) return -1
      count++
    } else {
      // Casa nova não pode encostar de lado numa letra: formaria uma corrida sem palavra.
      const [a, b] = dir === 'across' ? [at(r - 1, c), at(r + 1, c)] : [at(r, c - 1), at(r, c + 1)]
      if (a !== null || b !== null) return -1
    }
  }
  return count
}

function put(board: Board, letters: string[], row: number, col: number, dir: Direction) {
  letters.forEach((letter, i) => {
    const { r, c } = cellAt(dir, row, col, i)
    board.letters[r]![c] = letter
    board.used[r]![c]!.add(dir)
  })
}

function shuffle<T>(items: readonly T[], random: () => number): T[] {
  const copy = [...items]
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1))
    ;[copy[i], copy[j]] = [copy[j]!, copy[i]!]
  }
  return copy
}

// Melhor primeiro: a cada passo põe, entre todas as palavras que faltam, a posição com mais
// cruzamentos (desempate pela palavra mais curta e por ruído). Com palavras reais isso põe bem mais
// palavras que encaixar uma por uma na ordem sorteada (T032: 17 contra 14 no 11 x 11).
function layoutOnce(words: readonly ValidWord[], size: number, random: () => number): Placement[] {
  // Primeira palavra: das mais longas (com ruído), em linha e coluna sorteadas.
  const [first, ...rest] = shuffle(words, random).sort(
    (a, b) => [...b.answer].length - [...a.answer].length + (random() - 0.5) * 6,
  )
  const board = emptyBoard(size)
  const placed: Placement[] = []
  if (!first) return placed
  const firstLetters = [...first.answer]
  const firstRow = Math.floor(random() * size)
  const firstCol = Math.floor(random() * (size - firstLetters.length + 1))
  put(board, firstLetters, firstRow, firstCol, 'across')
  placed.push({ ...first, row: firstRow, col: firstCol, direction: 'across' })

  let pending = rest
  for (;;) {
    let best: { word: ValidWord; row: number; col: number; dir: Direction; score: number } | null =
      null
    for (const word of pending) {
      const letters = [...word.answer]
      for (let r = 0; r < size; r++) {
        for (let c = 0; c < size; c++) {
          const existing = board.letters[r]![c]
          if (existing === null) continue
          for (let i = 0; i < letters.length; i++) {
            if (letters[i] !== existing) continue
            for (const dir of ['across', 'down'] as const) {
              const row = dir === 'across' ? r : r - i
              const col = dir === 'across' ? c - i : c
              const count = crossings(board, letters, row, col, dir)
              if (count < 1) continue
              const score = count * 2 - letters.length * 0.1 + random()
              if (!best || score > best.score) best = { word, row, col, dir, score }
            }
          }
        }
      }
    }
    if (!best) return placed
    const chosen = best
    put(board, [...chosen.word.answer], chosen.row, chosen.col, chosen.dir)
    placed.push({ ...chosen.word, row: chosen.row, col: chosen.col, direction: chosen.dir })
    pending = pending.filter((word) => word !== chosen.word)
  }
}

/**
 * Melhor montagem em até 200 ordens das palavras, ou `null` se nenhuma chega a `minWords(size)`.
 * Toda palavra posta cruza outra, então a grade sai ligada.
 */
export function layout(
  words: readonly ValidWord[],
  size: number,
  seed: number,
): Placement[] | null {
  const fitting = words.filter((word) => [...word.answer].length <= size)
  const random = seededRandom(seed)
  let best: Placement[] = []
  for (let attempt = 0; attempt < ATTEMPTS; attempt++) {
    const placed = layoutOnce(fitting, size, random)
    if (placed.length > best.length) best = placed
  }
  return best.length >= minWords(size) ? best : null
}

export type GeneratedPuzzle = { puzzle: Puzzle; solution: Solution }

/** Converte a montagem no formato interno, conferido pelas mesmas regras de qualquer puzzle. */
export function toPuzzle(
  placements: readonly Placement[],
  options: { source: PuzzleSourceId; date: string; size: number; difficulty: Difficulty },
): GeneratedPuzzle | null {
  const { size } = options
  const letters = Array.from({ length: size }, () => Array<string | null>(size).fill(null))
  for (const p of placements) {
    ;[...p.answer].forEach((letter, i) => {
      const { r, c } = cellAt(p.direction, p.row, p.col, i)
      letters[r]![c] = letter
    })
  }
  const startsAt = (row: number, col: number) =>
    placements.filter((p) => p.row === row && p.col === col)
  const numbers = new Map<string, number>()
  let next = 1
  for (let r = 0; r < size; r++) {
    for (let c = 0; c < size; c++) {
      if (startsAt(r, c).length > 0) numbers.set(`${r}:${c}`, next++)
    }
  }
  const cells: Cell[][] = letters.map((line, r) =>
    line.map((letter, c): Cell =>
      letter === null
        ? { kind: 'block' }
        : { kind: 'open', number: numbers.get(`${r}:${c}`) ?? null },
    ),
  )
  const words: Word[] = placements
    .map((p) => ({
      number: numbers.get(`${p.row}:${p.col}`)!,
      direction: p.direction,
      row: p.row,
      col: p.col,
      length: [...p.answer].length,
      clue: p.clue,
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
      title: `Dificuldade: ${difficultyLabels[options.difficulty]}`,
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
