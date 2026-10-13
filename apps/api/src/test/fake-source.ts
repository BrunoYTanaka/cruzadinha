import type { Level } from '@cruzadinha/shared'
import { agilmenteResponseSchema } from '../sources/oglobo/agilmente-schema'
import { convertAgilmenteResponse } from '../sources/oglobo/convert'
import dailyValid from '../sources/oglobo/fixtures/daily-valid.json'
import type { FetchPuzzleResult, FetchPuzzleSuccess, PuzzleSource } from '../sources/types'

export type FakeSource = PuzzleSource & { calls: string[] }

/** Resultado de sucesso com o puzzle da fixture (5 x 5, texto inventado) na data pedida. */
export function okResult(date: string): FetchPuzzleSuccess {
  const converted = convertAgilmenteResponse(
    agilmenteResponseSchema.parse(dailyValid),
    'daily',
    date,
  )
  if (!converted.ok) throw new Error('fixture daily-valid.json deveria converter')
  return converted
}

/**
 * Fonte falsa: devolve o resultado mapeado para a data e `unavailable` para as demais.
 * `calls` registra cada data pedida, na ordem.
 */
export function fakeSource(responses: Map<string, FetchPuzzleResult> = new Map()): FakeSource {
  const calls: string[] = []
  return {
    id: 'oglobo',
    calls,
    async fetchPuzzle(_level: Level, date: string) {
      calls.push(date)
      return responses.get(date) ?? { ok: false, reason: 'unavailable' }
    },
  }
}
