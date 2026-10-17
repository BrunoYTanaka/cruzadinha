import { puzzleSourceNames, type Level, type PuzzleSourceId } from '@cruzadinha/shared'
import { agilmenteResponseSchema } from '../sources/oglobo/agilmente-schema'
import { convertAgilmenteResponse } from '../sources/oglobo/convert'
import dailyValid from '../sources/oglobo/fixtures/daily-valid.json'
import type { FetchPuzzleResult, FetchPuzzleSuccess, PuzzleSource } from '../sources/types'

export type FakeSource = PuzzleSource & { calls: string[] }

/**
 * Resultado de sucesso com o puzzle da fixture (5 x 5, texto inventado) na data pedida. Com outra
 * fonte, só a fonte e o nome da atribuição mudam: o par continua coerente.
 */
export function okResult(date: string, source: PuzzleSourceId = 'oglobo'): FetchPuzzleSuccess {
  const converted = convertAgilmenteResponse(
    agilmenteResponseSchema.parse(dailyValid),
    'daily',
    date,
  )
  if (!converted.ok) throw new Error('fixture daily-valid.json deveria converter')
  const { puzzle } = converted
  return {
    ...converted,
    puzzle: {
      ...puzzle,
      source,
      attribution: { ...puzzle.attribution, sourceName: puzzleSourceNames[source] },
    },
  }
}

export type FakeSourceOptions = {
  id?: PuzzleSourceId
  /** Datas em que `fetchPuzzle` lança, para simular um erro inesperado do adaptador. */
  throwOn?: ReadonlySet<string>
}

/**
 * Fonte falsa: devolve o resultado mapeado para a data e `unavailable` para as demais.
 * `calls` registra cada data pedida, na ordem.
 */
export function fakeSource(
  responses: Map<string, FetchPuzzleResult> = new Map(),
  options: FakeSourceOptions = {},
): FakeSource {
  const calls: string[] = []
  return {
    id: options.id ?? 'oglobo',
    calls,
    async fetchPuzzle(_level: Level, date: string) {
      calls.push(date)
      if (options.throwOn?.has(date)) throw new Error('falha inesperada da fonte falsa')
      return responses.get(date) ?? { ok: false, reason: 'unavailable' }
    },
  }
}
