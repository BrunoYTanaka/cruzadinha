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

/**
 * Uma edição achada na fonte, ou a falha que interrompeu a busca (depois dela o iterador acaba). A
 * data e o autor já são conhecidos; o puzzle só é pedido em `loadPuzzle()`.
 */
export type EditionListing =
  | {
      ok: true
      date: string
      author: string | null
      /** Pede o que falta (o script) e converte. A coleta só chama para datas ainda não salvas. */
      loadPuzzle(): Promise<FetchPuzzleResult>
    }
  | { ok: false; reason: FetchFailureReason; detail?: string }

export interface PuzzleSource {
  readonly id: PuzzleSourceId
  /**
   * `false` quando a fonte não tem busca por data (feature 030): `fetchPuzzle` responde
   * `unavailable` sem pedido e o serviço só entrega o que a coleta salvou. Padrão: `true`.
   */
  readonly onDemand?: boolean
  /**
   * Edições da mais nova para a mais antiga, até `oldestDate`. A coleta usa isto no lugar de
   * pedir por data quando a fonte não tem busca por data.
   */
  listRecent?(options: {
    oldestDate: string
    /** Chamado antes de cada pedido à fonte, para a coleta fazer a pausa entre pedidos. */
    beforeRequest?: () => Promise<void>
  }): AsyncIterable<EditionListing>
  /** Lança TypeError para nível ou data inválidos; falhas da fonte vêm no resultado. */
  fetchPuzzle(level: Level, date: string): Promise<FetchPuzzleResult>
}
