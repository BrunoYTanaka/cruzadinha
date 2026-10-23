import { puzzleSourceNames, type Level, type PuzzleSourceId } from '@cruzadinha/shared'
import { agilmenteResponseSchema } from '../sources/oglobo/agilmente-schema'
import { convertAgilmenteResponse } from '../sources/oglobo/convert'
import dailyValid from '../sources/oglobo/fixtures/daily-valid.json'
import type {
  EditionListing,
  FetchPuzzleResult,
  FetchPuzzleSuccess,
  PuzzleSource,
} from '../sources/types'

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

export type FakeListedSource = PuzzleSource & {
  /** Datas das edições entregues pela lista, na ordem. */
  listed: string[]
  /** Datas cujo puzzle foi pedido (o segundo pedido da edição). */
  loaded: string[]
  fetchCalls: string[]
}

export type FakeListedOptions = {
  id?: PuzzleSourceId
  /** Falha entregue depois das edições (o iterador acaba nela). */
  failure?: Extract<EditionListing, { ok: false }>
  /** Datas cujo `loadPuzzle` lança. */
  throwOnLoad?: ReadonlySet<string>
  /** Lança ao iniciar a lista. */
  throwOnList?: boolean
}

/**
 * Fonte que lista edições, como a `clube` (feature 030): sem busca por data, `listRecent` entrega as
 * edições da mais nova à mais antiga até `oldestDate`, e o puzzle só vem em `loadPuzzle()`.
 */
export function fakeListedSource(
  editions: { date: string; result?: FetchPuzzleResult }[],
  options: FakeListedOptions = {},
): FakeListedSource {
  const id = options.id ?? 'clube'
  const listed: string[] = []
  const loaded: string[] = []
  const fetchCalls: string[] = []
  const sorted = [...editions].sort((a, b) => b.date.localeCompare(a.date))
  return {
    id,
    onDemand: false,
    listed,
    loaded,
    fetchCalls,
    async fetchPuzzle(_level: Level, date: string) {
      fetchCalls.push(date)
      return { ok: false, reason: 'unavailable' }
    },
    async *listRecent({ oldestDate, beforeRequest }): AsyncGenerator<EditionListing> {
      if (options.throwOnList) throw new Error('falha inesperada da lista')
      await beforeRequest?.()
      for (const edition of sorted) {
        if (edition.date < oldestDate) return
        await beforeRequest?.()
        listed.push(edition.date)
        yield {
          ok: true,
          date: edition.date,
          author: 'Autora de teste',
          async loadPuzzle() {
            await beforeRequest?.()
            loaded.push(edition.date)
            if (options.throwOnLoad?.has(edition.date)) throw new Error('falha inesperada')
            return edition.result ?? okResult(edition.date, id)
          },
        }
      }
      if (options.failure) yield options.failure
    },
  }
}
