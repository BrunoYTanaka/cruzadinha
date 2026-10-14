import type { LibraryItem, Progress, Puzzle, PuzzleResponse, Solution } from '@cruzadinha/shared'

export const PUZZLE_ID = '0b9a3a4e-6d0e-4b6c-9a52-1f2e3d4c5b6a'

// Monta um puzzle válido a partir de linhas de texto: `#` é bloco e qualquer outro caractere é a
// letra da solução. Numera como as cruzadas: da esquerda para a direita, de cima para baixo.
export function makePuzzle(rows: string[], date = '2026-10-14'): Puzzle {
  const height = rows.length
  const width = rows[0]?.length ?? 0
  const open = (r: number, c: number) =>
    r >= 0 && c >= 0 && r < height && c < width && rows[r]?.[c] !== '#'
  const cells: Puzzle['grid']['cells'] = []
  const words: Puzzle['words'] = []
  let counter = 0
  for (let r = 0; r < height; r++) {
    const line: Puzzle['grid']['cells'][number] = []
    for (let c = 0; c < width; c++) {
      if (!open(r, c)) {
        line.push({ kind: 'block' })
        continue
      }
      const across = !open(r, c - 1) && open(r, c + 1)
      const down = !open(r - 1, c) && open(r + 1, c)
      const number = across || down ? ++counter : null
      line.push({ kind: 'open', number })
      if (number !== null && across) {
        let length = 0
        while (open(r, c + length)) length++
        words.push({
          number,
          direction: 'across',
          row: r,
          col: c,
          length,
          clue: `Dica ${number} horizontal`,
        })
      }
      if (number !== null && down) {
        let length = 0
        while (open(r + length, c)) length++
        words.push({
          number,
          direction: 'down',
          row: r,
          col: c,
          length,
          clue: `Dica ${number} vertical`,
        })
      }
    }
    cells.push(line)
  }
  return {
    source: 'oglobo',
    level: 'daily',
    date,
    attribution: {
      sourceName: 'O Globo',
      title: 'Diária de exemplo',
      author: null,
      copyright: null,
    },
    grid: { width, height, cells },
    words,
  }
}

export function makeSolution(rows: string[]): Solution {
  return { cells: rows.map((row) => Array.from(row).map((ch) => (ch === '#' ? null : ch))) }
}

export function makePuzzleResponse(
  rows: string[],
  options: { puzzleId?: string; date?: string } = {},
): PuzzleResponse {
  return {
    puzzleId: options.puzzleId ?? PUZZLE_ID,
    puzzle: makePuzzle(rows, options.date),
    solution: makeSolution(rows),
  }
}

// Letras do jogador a partir de linhas de texto: `.` é vazia e `#` é bloco.
export function cellsFrom(rows: string[]): (string | null)[][] {
  return rows.map((row) => Array.from(row).map((ch) => (ch === '#' || ch === '.' ? null : ch)))
}

export const TINY = ['CAL', 'A#O', 'SOL']

// 5 × 5 com blocos no meio, palavras de 2 a 5 letras e células cruzadas.
// Horizontais: 1 CASA, 4 MO, 5 AR, 6 ARTES, 7 RE, 8 LO, 9 SOL. Verticais: 1 CORE, 2 SAELO,
// 3 ARSOL, 4 MARE.
export const LAYOUT5 = ['#CASA', 'MO#AR', 'ARTES', 'RE#LO', 'E#SOL']

export function makeLibraryItem(date: string, overrides: Partial<LibraryItem> = {}): LibraryItem {
  const digits = date.replaceAll('-', '')
  return {
    puzzleId: `00000000-0000-4000-8000-0000${digits}`,
    date,
    level: 'daily',
    status: 'not_started',
    elapsedMs: null,
    finishedMs: null,
    completedAt: null,
    bestMs: null,
    bestAt: null,
    ...overrides,
  }
}

export function makeProgress(overrides: Partial<Progress> = {}): Progress {
  return {
    puzzleId: PUZZLE_ID,
    cells: cellsFrom(['...', '.#.', '...']),
    elapsedMs: 0,
    status: 'in_progress',
    savedAt: '2026-10-14T12:00:00.000Z',
    completedAt: null,
    finishedMs: null,
    bestMs: null,
    bestAt: null,
    updatedAt: '2026-10-14T12:00:00.000Z',
    ...overrides,
  }
}
