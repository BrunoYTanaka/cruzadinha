import {
  puzzleSchema,
  puzzleSourceNames,
  validatePuzzleWithSolution,
  type Cell,
  type Level,
  type Puzzle,
  type Solution,
  type Word,
} from '@cruzadinha/shared'
import type { FetchPuzzleFailure, FetchPuzzleSuccess } from '../types'
import { clueText } from '../cruzadaonline/clue-text'
import { clubeDocSchema, type ClubeDoc } from './schema'

type ConvertFailure = FetchPuzzleFailure & { reason: 'unexpected-format' | 'unsupported' }
export type ConvertResult = FetchPuzzleSuccess | ConvertFailure

class ConversionError extends Error {
  constructor(
    readonly reason: ConvertFailure['reason'],
    readonly detail: string,
  ) {
    super(detail)
  }
}

const unexpected = (detail: string) => new ConversionError('unexpected-format', detail)
const unsupported = (detail: string) => new ConversionError('unsupported', detail)

type Crossword = ClubeDoc['crossword-compiler-applet']['rectangular-puzzle']['crossword']
type Direction = 'across' | 'down'
type Placement = { id: string; direction: Direction; row: number; col: number; length: number }

// O detalhe só leva coordenadas e ids, nunca letras nem texto de dica.
type Grid = {
  open: boolean[][]
  letters: (string | null)[][]
  bars: { left: boolean[][]; top: boolean[][] }
}

function toGrid({ grid }: Crossword): Grid {
  const { width, height } = grid
  const blank = <T>(value: T) =>
    Array.from({ length: height }, () => Array.from({ length: width }, () => value))
  const seen = blank(false)
  const open = blank(false)
  const letters = blank<string | null>(null)
  const bars = { left: blank(false), top: blank(false) }

  for (const cell of grid.cell) {
    const where = `cell ${cell.x},${cell.y}`
    if (cell.x > width || cell.y > height) throw unexpected(`${where}: fora da grade`)
    // Coluna e linha começam em 1 no arquivo.
    const [row, col] = [cell.y - 1, cell.x - 1]
    if (seen[row]![col]) throw unexpected(`${where}: repetida`)
    seen[row]![col] = true
    bars.left[row]![col] = cell['left-bar'] === 'true'
    bars.top[row]![col] = cell['top-bar'] === 'true'

    if (cell.type === 'block') continue
    if (cell.type !== undefined) throw unsupported(`${where}: tipo de célula não suportado`)
    if (cell.solution === undefined || cell.solution.length === 0) {
      throw unexpected(`${where}: solução ausente`)
    }
    if (Array.from(cell.solution).length > 1) throw unsupported(`${where}: mais de uma letra`)
    open[row]![col] = true
    letters[row]![col] = cell.solution.toLocaleUpperCase('pt-BR')
  }
  for (let row = 0; row < height; row++) {
    for (let col = 0; col < width; col++) {
      if (!seen[row]![col]) throw unexpected(`cell ${col + 1},${row + 1}: ausente`)
    }
  }
  return { open, letters, bars }
}

function parseSpan(text: string, where: string): [number, number] {
  const [start, end = start] = text.split('-').map(Number) as [number, number?]
  if (start < 1) throw unexpected(`${where}: coordenada inválida`)
  if (end < start) throw unsupported(`${where}: intervalo decrescente`)
  return [start, end]
}

function toPlacements({ word }: Crossword): Placement[] {
  const ids = new Set<string>()
  return word.map((entry) => {
    const where = `word ${entry.id}`
    if (ids.has(entry.id)) throw unexpected(`${where}: id repetido`)
    ids.add(entry.id)
    const [x1, x2] = parseSpan(entry.x, where)
    const [y1, y2] = parseSpan(entry.y, where)
    const across = x2 > x1
    const down = y2 > y1
    if (across === down) {
      throw unexpected(`${where}: ${across ? 'dois eixos em intervalo' : 'palavra de uma letra'}`)
    }
    return {
      id: entry.id,
      direction: across ? 'across' : 'down',
      row: y1 - 1,
      col: x1 - 1,
      length: across ? x2 - x1 + 1 : y2 - y1 + 1,
    }
  })
}

// A fonte não numera as dicas: cada célula onde começa alguma palavra recebe o próximo número, da
// esquerda para a direita e de cima para baixo, como nas outras cruzadas.
function numberStarts(placements: Placement[], height: number, width: number) {
  const starts = new Set(placements.map(({ row, col }) => `${row},${col}`))
  const numbers = new Map<string, number>()
  let counter = 0
  for (let row = 0; row < height; row++) {
    for (let col = 0; col < width; col++) {
      if (starts.has(`${row},${col}`)) numbers.set(`${row},${col}`, ++counter)
    }
  }
  return numbers
}

function attachClues(
  crossword: Crossword,
  placements: Placement[],
  numbers: Map<string, number>,
): Word[] {
  const byId = new Map(placements.map((placement) => [placement.id, placement]))
  const texts = new Map<string, string>()
  for (const group of crossword.clues) {
    for (const clue of group.clue ?? []) {
      const where = `clue ${clue.word}`
      if (!byId.has(clue.word)) throw unexpected(`${where}: palavra inexistente`)
      if (texts.has(clue.word)) throw unexpected(`${where}: palavra com duas dicas`)
      const text = clueText(clue['#text'] ?? '')
      if (text === null) throw unexpected(`${where}: dica vazia ou com entidade desconhecida`)
      texts.set(clue.word, text)
    }
  }
  return placements.map(({ id, direction, row, col, length }) => {
    const clue = texts.get(id)
    if (clue === undefined) throw unexpected(`word ${id}: sem dica`)
    return { number: numbers.get(`${row},${col}`)!, direction, row, col, length, clue }
  })
}

// As barras do arquivo e os limites das palavras têm de contar a mesma história: uma barra dentro
// de uma palavra, ou duas palavras coladas sem barra, indica um arquivo que não entendemos.
function checkBars({ open, bars }: Grid, placements: Placement[]) {
  const owner = new Map<string, string>()
  for (const { id, direction, row, col, length } of placements) {
    for (let i = 0; i < length; i++) {
      const [r, c] = direction === 'across' ? [row, col + i] : [row + i, col]
      owner.set(`${direction}:${r},${c}`, id)
    }
  }
  const apart = (direction: Direction, a: [number, number], b: [number, number]) => {
    const first = owner.get(`${direction}:${a[0]},${a[1]}`)
    const second = owner.get(`${direction}:${b[0]},${b[1]}`)
    return (first !== undefined || second !== undefined) && first !== second
  }
  open.forEach((line, row) =>
    line.forEach((isOpen, col) => {
      if (!isOpen) return
      // Só há barra entre duas células abertas; na borda da grade ela não separa nada.
      if (col > 0 && open[row]![col - 1]) {
        if (bars.left[row]![col] !== apart('across', [row, col - 1], [row, col])) {
          throw unexpected(`cell ${col + 1},${row + 1}: left-bar não bate com as palavras`)
        }
      }
      if (row > 0 && open[row - 1]![col]) {
        if (bars.top[row]![col] !== apart('down', [row - 1, col], [row, col])) {
          throw unexpected(`cell ${col + 1},${row + 1}: top-bar não bate com as palavras`)
        }
      }
    }),
  )
}

function metadataText(raw: string | undefined): string | null {
  return raw === undefined ? null : clueText(raw)
}

function issueDetail(issue: { path: PropertyKey[]; message: string }): string {
  return `${issue.path.map(String).join('.')}: ${issue.message}`
}

/**
 * Converte o documento lido do XML do Cruzadas Clube para o formato interno. Função pura. O autor
 * da página tem prioridade sobre o `creator` do arquivo.
 */
export function convertClube(
  doc: unknown,
  level: Level,
  date: string,
  author: string | null = null,
): ConvertResult {
  try {
    const parsed = clubeDocSchema.safeParse(doc)
    if (!parsed.success) throw unexpected(issueDetail(parsed.error.issues[0]!))
    const { crossword, metadata } = parsed.data['crossword-compiler-applet']['rectangular-puzzle']

    const grid = toGrid(crossword)
    const placements = toPlacements(crossword)
    checkBars(grid, placements)
    const { width, height } = crossword.grid
    const numbers = numberStarts(placements, height, width)
    const words = attachClues(crossword, placements, numbers)
    const cells: Cell[][] = grid.open.map((line, row) =>
      line.map((isOpen, col) =>
        isOpen
          ? { kind: 'open' as const, number: numbers.get(`${row},${col}`) ?? null }
          : { kind: 'block' as const },
      ),
    )
    const solution: Solution = { cells: grid.letters }

    const puzzle = puzzleSchema.safeParse({
      source: 'clube',
      level,
      date,
      attribution: {
        sourceName: puzzleSourceNames.clube,
        title: metadataText(metadata?.title),
        author: author ?? metadataText(metadata?.creator),
        // O aviso do arquivo repete o autor; a atribuição já mostra fonte, título e autor.
        copyright: null,
      },
      grid: { width, height, cells },
      words,
    } satisfies Puzzle)
    if (!puzzle.success) throw unexpected(issueDetail(puzzle.error.issues[0]!))

    const pair = validatePuzzleWithSolution(puzzle.data, solution)
    if (!pair.success) throw unexpected(issueDetail(pair.issues[0]!))

    return { ok: true, puzzle: puzzle.data, solution, dates: [] }
  } catch (error) {
    if (error instanceof ConversionError) {
      return { ok: false, reason: error.reason, detail: error.detail }
    }
    throw error
  }
}
