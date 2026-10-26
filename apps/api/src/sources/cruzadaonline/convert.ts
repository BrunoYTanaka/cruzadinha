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
import { clueText } from '../common/clue-text'
import { crosswordCompilerSchema, type CrosswordCompilerDoc } from './crossword-compiler-schema'

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

type Crossword = CrosswordCompilerDoc['crossword-compiler']['rectangular-puzzle']['crossword']

// O detalhe só leva coordenadas e ids, nunca letras nem texto de dica (FR-010).
type Grid = { cells: Cell[][]; letters: (string | null)[][] }

function toGrid({ grid }: Crossword): Grid {
  const { width, height } = grid
  const cells: (Cell | undefined)[][] = Array.from({ length: height }, () =>
    Array.from({ length: width }, () => undefined),
  )
  const letters: (string | null)[][] = Array.from({ length: height }, () =>
    Array.from({ length: width }, () => null),
  )

  for (const cell of grid.cell) {
    const where = `cell ${cell.x},${cell.y}`
    if (cell.x > width || cell.y > height) throw unexpected(`${where}: fora da grade`)
    // Coluna e linha começam em 1 no arquivo.
    const [row, col] = [cell.y - 1, cell.x - 1]
    if (cells[row]![col] !== undefined) throw unexpected(`${where}: repetida`)

    if (cell.type !== undefined) {
      if (cell.type !== 'block') throw unsupported(`${where}: tipo de célula não suportado`)
      cells[row]![col] = { kind: 'block' }
      continue
    }
    if (cell.solution === undefined || cell.solution.length === 0) {
      throw unexpected(`${where}: solução ausente`)
    }
    if (Array.from(cell.solution).length > 1) throw unsupported(`${where}: mais de uma letra`)
    cells[row]![col] = { kind: 'open', number: cell.number ?? null }
    letters[row]![col] = cell.solution.toLocaleUpperCase('pt-PT')
  }

  return {
    cells: cells.map((line, row) =>
      line.map((cell, col) => {
        if (cell === undefined) throw unexpected(`cell ${col + 1},${row + 1}: ausente`)
        return cell
      }),
    ),
    letters,
  }
}

function parseSpan(text: string, where: string): [number, number] {
  const [start, end = start] = text.split('-').map(Number) as [number, number?]
  if (start < 1) throw unexpected(`${where}: coordenada inválida`)
  if (end < start) throw unsupported(`${where}: intervalo decrescente`)
  return [start, end]
}

type Placement = Omit<Word, 'clue'>

function toPlacements({ word }: Crossword, cells: Cell[][]): Map<string, Placement> {
  const placements = new Map<string, Placement>()
  for (const entry of word) {
    const where = `word ${entry.id}`
    if (entry.cells !== undefined) throw unsupported(`${where}: palavra em mais de um trecho`)
    if (placements.has(entry.id)) throw unexpected(`${where}: id repetido`)
    const [x1, x2] = parseSpan(entry.x, where)
    const [y1, y2] = parseSpan(entry.y, where)
    const across = x2 > x1
    const down = y2 > y1
    if (across === down) {
      throw unexpected(`${where}: ${across ? 'dois eixos em intervalo' : 'palavra de uma letra'}`)
    }
    const [row, col] = [y1 - 1, x1 - 1]
    const start = cells[row]?.[col]
    if (start?.kind !== 'open' || start.number === null) {
      throw unexpected(`${where}: a célula inicial não tem número`)
    }
    placements.set(entry.id, {
      number: start.number,
      direction: across ? 'across' : 'down',
      row,
      col,
      length: across ? x2 - x1 + 1 : y2 - y1 + 1,
    })
  }
  return placements
}

// A direção vem da palavra, não do título do grupo (Edge Cases da spec).
function attachClues(crossword: Crossword, placements: Map<string, Placement>): Word[] {
  const texts = new Map<string, string>()
  for (const group of crossword.clues) {
    for (const clue of group.clue ?? []) {
      const where = `clue ${clue.number}`
      const placement = placements.get(clue.word)
      if (!placement) throw unexpected(`${where}: palavra ${clue.word} não existe`)
      if (texts.has(clue.word)) throw unexpected(`${where}: palavra ${clue.word} com duas dicas`)
      if (clue.number !== placement.number) {
        throw unexpected(`${where}: a palavra ${clue.word} começa no número ${placement.number}`)
      }
      // Só um formato inteiro é conferido; um composto ("2,3") é ignorado.
      if (clue.format !== undefined && /^\d+$/.test(clue.format)) {
        if (Number(clue.format) !== placement.length) {
          throw unexpected(`${where}: tamanho diferente do da palavra ${clue.word}`)
        }
      }
      const text = clueText(clue['#text'] ?? '')
      if (text === null) throw unexpected(`${where}: dica vazia ou com entidade desconhecida`)
      texts.set(clue.word, text)
    }
  }

  return [...placements].map(([id, placement]) => {
    const clue = texts.get(id)
    if (clue === undefined) throw unexpected(`word ${id}: sem dica`)
    return { ...placement, clue }
  })
}

function metadataText(raw: string | undefined): string | null {
  return raw === undefined ? null : clueText(raw)
}

function issueDetail(issue: { path: PropertyKey[]; message: string }): string {
  return `${issue.path.map(String).join('.')}: ${issue.message}`
}

/** Converte o documento lido do XML do Crossword Compiler para o formato interno. Função pura. */
export function convertCrosswordCompiler(doc: unknown, level: Level, date: string): ConvertResult {
  try {
    const parsed = crosswordCompilerSchema.safeParse(doc)
    if (!parsed.success) throw unexpected(issueDetail(parsed.error.issues[0]!))
    const root = parsed.data['crossword-compiler']['rectangular-puzzle']
    const { crossword, metadata } = root

    const { cells, letters } = toGrid(crossword)
    const words = attachClues(crossword, toPlacements(crossword, cells))
    const solution: Solution = { cells: letters }

    const puzzle = puzzleSchema.safeParse({
      source: 'cruzadaonline',
      level,
      date,
      attribution: {
        sourceName: puzzleSourceNames.cruzadaonline,
        title: metadataText(metadata?.title),
        author: metadataText(metadata?.creator),
        // O arquivo vem sem direitos: vale o nome da cruzada (decisão do autor).
        copyright: metadataText(metadata?.copyright) ?? puzzleSourceNames.cruzadaonline,
      },
      grid: { width: crossword.grid.width, height: crossword.grid.height, cells },
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
