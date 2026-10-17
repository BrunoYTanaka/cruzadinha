import {
  isoDateSchema,
  puzzleSchema,
  puzzleSourceNames,
  validatePuzzleWithSolution,
  type AvailableDate,
  type Cell,
  type Level,
  type Puzzle,
  type Solution,
  type Word,
} from '@cruzadinha/shared'
import type { FetchPuzzleFailure, FetchPuzzleSuccess } from '../types'
import type { AgilmenteResponse } from './agilmente-schema'

const CROSSWORD_KIND = 'http://ipuz.org/crossword#1'

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

type Ipuz = AgilmenteResponse['ipuzData']

function checkShape(rows: unknown[][], { width, height }: Ipuz['dimensions'], field: string) {
  if (rows.length !== height || rows.some((row) => row.length !== width)) {
    throw unexpected(`ipuzData.${field}: deve ter ${height} linhas de ${width} células`)
  }
}

function toCells(ipuz: Ipuz): Cell[][] {
  const block = ipuz.block ?? '#'
  const empty = ipuz.empty ?? 0
  return ipuz.puzzle.map((row, r) =>
    row.map((value, c): Cell => {
      const path = `ipuzData.puzzle.${r}.${c}`
      if (value === null || value === undefined) throw unsupported(`${path}: célula ausente`)
      if (typeof value === 'object') throw unsupported(`${path}: célula com estilo`)
      if (value === block) return { kind: 'block' }
      if (value === empty || value === 0) return { kind: 'open', number: null }
      if (typeof value === 'number' && Number.isInteger(value) && value > 0) {
        return { kind: 'open', number: value }
      }
      throw unexpected(`${path}: valor de célula desconhecido`)
    }),
  )
}

type Placement = Omit<Word, 'clue'>

function findWords(cells: Cell[][]): Placement[] {
  const isOpen = (r: number, c: number) => cells[r]?.[c]?.kind === 'open'
  const placements: Placement[] = []

  for (const direction of ['across', 'down'] as const) {
    const [dr, dc] = direction === 'across' ? [0, 1] : [1, 0]
    cells.forEach((row, r) =>
      row.forEach((cell, c) => {
        if (cell.kind !== 'open' || isOpen(r - dr, c - dc) || !isOpen(r + dr, c + dc)) return
        let length = 1
        while (isOpen(r + dr * length, c + dc * length)) length++
        if (cell.number === null) {
          throw unexpected(`ipuzData.puzzle.${r}.${c}: palavra começa em célula sem número`)
        }
        placements.push({ number: cell.number, direction, row: r, col: c, length })
      }),
    )
  }
  return placements
}

function toClueMap(entries: unknown[], field: 'Across' | 'Down'): Map<number, string> {
  const clues = new Map<number, string>()
  entries.forEach((entry, i) => {
    const path = `ipuzData.clues.${field}.${i}`
    const isPair =
      Array.isArray(entry) &&
      entry.length === 2 &&
      typeof entry[0] === 'number' &&
      typeof entry[1] === 'string'
    if (!isPair) throw unsupported(`${path}: esperado par [número, texto]`)
    const [number, text] = entry as [number, string]
    if (clues.has(number)) throw unexpected(`${path}: número de dica repetido`)
    if (text.trim().length === 0) throw unexpected(`${path}: dica vazia`)
    clues.set(number, text)
  })
  return clues
}

function attachClues(placements: Placement[], ipuz: Ipuz): Word[] {
  const maps = {
    across: toClueMap(ipuz.clues.Across, 'Across'),
    down: toClueMap(ipuz.clues.Down, 'Down'),
  }
  const words = placements.map((placement): Word => {
    const map = maps[placement.direction]
    const clue = map.get(placement.number)
    if (clue === undefined) {
      throw unexpected(`palavra ${placement.number} ${placement.direction} sem dica`)
    }
    map.delete(placement.number)
    return { ...placement, clue }
  })
  for (const [direction, map] of Object.entries(maps)) {
    const [extra] = map.keys()
    if (extra !== undefined) throw unexpected(`dica ${extra} ${direction} sem palavra`)
  }
  return words
}

function toSolution(ipuz: Ipuz, cells: Cell[][]): Solution {
  const block = ipuz.block ?? '#'
  return {
    cells: cells.map((row, r) =>
      row.map((cell, c) => {
        const value = ipuz.solution[r]?.[c]
        const path = `ipuzData.solution.${r}.${c}`
        if (cell.kind === 'block') {
          if (value !== block && value !== null) throw unexpected(`${path}: esperado bloco`)
          return null
        }
        if (typeof value !== 'string' || value.length === 0 || value === block) {
          throw unexpected(`${path}: esperada uma letra`)
        }
        if (Array.from(value).length > 1) throw unsupported(`${path}: mais de uma letra`)
        return value.toLocaleUpperCase('pt-BR')
      }),
    ),
  }
}

function toDates(entries: unknown[] | undefined): AvailableDate[] {
  return (entries ?? []).flatMap((entry) => {
    if (typeof entry !== 'object' || entry === null) return []
    const { date, inTheFuture } = entry as Record<string, unknown>
    if (!isoDateSchema.safeParse(date).success || typeof inTheFuture !== 'boolean') return []
    return [{ date: date as string, inTheFuture }]
  })
}

function issueDetail(issue: { path: PropertyKey[]; message: string }): string {
  return `${issue.path.map(String).join('.')}: ${issue.message}`
}

/** Converte a resposta da Agilmente (ipuz v2) para o formato interno. Função pura. */
export function convertAgilmenteResponse(
  body: AgilmenteResponse,
  level: Level,
  date: string,
): ConvertResult {
  try {
    const ipuz = body.ipuzData
    if (!ipuz.kind.some((kind) => kind.startsWith(CROSSWORD_KIND))) {
      throw unsupported('ipuzData.kind: não é palavra cruzada')
    }
    checkShape(ipuz.puzzle, ipuz.dimensions, 'puzzle')
    checkShape(ipuz.solution, ipuz.dimensions, 'solution')

    const cells = toCells(ipuz)
    const words = attachClues(findWords(cells), ipuz)
    const solution = toSolution(ipuz, cells)

    const parsed = puzzleSchema.safeParse({
      source: 'oglobo',
      level,
      date,
      attribution: {
        sourceName: puzzleSourceNames.oglobo,
        title: ipuz.title ?? null,
        author: ipuz.author ?? null,
        copyright: ipuz.copyright ?? null,
      },
      grid: { width: ipuz.dimensions.width, height: ipuz.dimensions.height, cells },
      words,
    } satisfies Puzzle)
    if (!parsed.success) throw unexpected(issueDetail(parsed.error.issues[0]!))

    const pair = validatePuzzleWithSolution(parsed.data, solution)
    if (!pair.success) throw unexpected(issueDetail(pair.issues[0]!))

    return { ok: true, puzzle: parsed.data, solution, dates: toDates(body.dates) }
  } catch (error) {
    if (error instanceof ConversionError) {
      return { ok: false, reason: error.reason, detail: error.detail }
    }
    throw error
  }
}
