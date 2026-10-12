import type { AvailableDate, Level, Puzzle, PuzzleSourceId, Solution } from '@cruzadinha/shared'

export type FetchFailureReason =
  'unavailable' | 'refused' | 'rate-limited' | 'source-down' | 'unexpected-format' | 'unsupported'

export type FetchPuzzleSuccess = {
  ok: true
  puzzle: Puzzle
  solution: Solution
  dates: AvailableDate[]
}

export type FetchPuzzleFailure = {
  ok: false
  reason: FetchFailureReason
  /** Texto curto para diagnóstico, sem token nem conteúdo da resposta. */
  detail?: string
}

export type FetchPuzzleResult = FetchPuzzleSuccess | FetchPuzzleFailure

export interface PuzzleSource {
  readonly id: PuzzleSourceId
  /** Lança TypeError para nível ou data inválidos; falhas da fonte vêm no resultado. */
  fetchPuzzle(level: Level, date: string): Promise<FetchPuzzleResult>
}
