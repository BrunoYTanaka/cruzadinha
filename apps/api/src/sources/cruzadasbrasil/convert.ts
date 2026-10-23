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
import { clueText } from './clue-text'
import { gameDataSchema, type GameData } from './page-schema'

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

// O detalhe só leva coordenadas e números, nunca letras nem texto de dica (FR-008).
type Direction = Word['direction']
type Placement = Omit<Word, 'clue'>

const DAILY_LEVEL = 'Diário'

function toGrid({ gabarito, dimensoes }: GameData) {
  if (gabarito.length !== dimensoes.linhas) throw unexpected('gabarito: linhas diferentes')
  const letters: (string | null)[][] = []
  for (const [row, line] of gabarito.entries()) {
    if (line.length !== dimensoes.colunas) throw unexpected(`gabarito: linha ${row}: colunas`)
    letters.push(
      line.map((value, col) => {
        if (value === '#') return null
        if (!/^\p{L}$/u.test(value)) throw unexpected(`gabarito: célula ${row},${col} inválida`)
        return value.toLocaleUpperCase('pt-BR').normalize('NFC')
      }),
    )
  }
  return letters
}

/** Numeração clássica: células iniciais de palavra de 2+ letras, em ordem de leitura. */
function toPlacements(letters: (string | null)[][]): {
  cells: Cell[][]
  placements: Placement[]
} {
  const height = letters.length
  const width = letters[0]?.length ?? 0
  const open = (row: number, col: number) =>
    row >= 0 && row < height && col >= 0 && col < width && letters[row]![col] !== null

  const placements: Placement[] = []
  let counter = 0
  const cells: Cell[][] = letters.map((line, row) =>
    line.map((_, col): Cell => {
      if (!open(row, col)) return { kind: 'block' }
      const across = !open(row, col - 1) && open(row, col + 1)
      const down = !open(row - 1, col) && open(row + 1, col)
      if (!across && !down) return { kind: 'open', number: null }
      counter++
      if (across) {
        let end = col
        while (open(row, end + 1)) end++
        placements.push({ number: counter, direction: 'across', row, col, length: end - col + 1 })
      }
      if (down) {
        let end = row
        while (open(end + 1, col)) end++
        placements.push({ number: counter, direction: 'down', row, col, length: end - row + 1 })
      }
      return { kind: 'open', number: counter }
    }),
  )
  return { cells, placements }
}

function checkPositions(data: GameData, placements: Placement[]) {
  const starts = new Map(placements.map((p) => [p.number, p]))
  if (data.posicoes_num.length !== starts.size) throw unexpected('posicoes_num: quantidade')
  const seen = new Set<number>()
  for (const { numero, x, y } of data.posicoes_num) {
    const start = starts.get(numero)
    if (!start) throw unexpected(`posicoes_num: número ${numero} inexistente`)
    if (seen.has(numero)) throw unexpected(`posicoes_num: número ${numero} repetido`)
    seen.add(numero)
    if (start.col !== x || start.row !== y) throw unexpected(`posicoes_num: número ${numero}`)
  }
}

function attachClues(data: GameData, placements: Placement[]): Word[] {
  const lists: Record<Direction, GameData['dicas']['horizontais']> = {
    across: data.dicas.horizontais,
    down: data.dicas.verticais,
  }
  const words: Word[] = []
  for (const direction of ['across', 'down'] as const) {
    const wanted = new Map(
      placements.filter((p) => p.direction === direction).map((p) => [p.number, p]),
    )
    const used = new Set<number>()
    for (const { numero, dica } of lists[direction]) {
      const where = `dica ${direction} ${numero}`
      const placement = wanted.get(numero)
      if (!placement) throw unexpected(`${where}: palavra inexistente`)
      if (used.has(numero)) throw unexpected(`${where}: número repetido`)
      used.add(numero)
      const clue = clueText(dica)
      if (clue === null) throw unexpected(`${where}: dica vazia ou com entidade desconhecida`)
      words.push({ ...placement, clue })
    }
    for (const number of wanted.keys()) {
      if (!used.has(number)) throw unexpected(`palavra ${direction} ${number}: sem dica`)
    }
  }
  return words
}

function issueDetail(issue: { path: PropertyKey[]; message: string }): string {
  return `${issue.path.map(String).join('.')}: ${issue.message}`
}

/** Converte os dados do jogo da Cruzadas Brasil para o formato interno. Função pura. */
export function convertCruzadasBrasil(raw: unknown, level: Level, date: string): ConvertResult {
  try {
    const parsed = gameDataSchema.safeParse(raw)
    if (!parsed.success) throw unexpected(issueDetail(parsed.error.issues[0]!))
    const data = parsed.data

    if (data.nivel !== DAILY_LEVEL) throw unsupported('nível diferente de diário')
    if (data.id !== date.replaceAll('-', '')) throw unexpected('id diferente da data pedida')

    const letters = toGrid(data)
    const { cells, placements } = toPlacements(letters)
    checkPositions(data, placements)
    const words = attachClues(data, placements)
    const solution: Solution = { cells: letters }

    const puzzle = puzzleSchema.safeParse({
      source: 'cruzadasbrasil',
      level,
      date,
      attribution: {
        sourceName: puzzleSourceNames.cruzadasbrasil,
        title: data.titulo === undefined ? null : clueText(data.titulo),
        author: null,
        copyright: null,
      },
      grid: { width: data.dimensoes.colunas, height: data.dimensoes.linhas, cells },
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
