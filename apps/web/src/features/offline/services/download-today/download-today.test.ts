import { puzzleSourceIdSchema, type PuzzleSourceId } from '@cruzadinha/shared'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { makePuzzleResponse, TINY } from '../../../../test/fixtures'
import { apiError, jsonResponse, mockApi } from '../../../../test/http'
import { listStoredPuzzles } from '../offline-store/offline-store'
import { downloadToday } from './download-today'

const sources = puzzleSourceIdSchema.options

// Um handler só: a chave do mock não leva a query, então a fonte vem da URL.
function api(failing: PuzzleSourceId[] = []) {
  return mockApi({
    'GET /api/puzzles': ({ url }) => {
      const source = new URL(url, 'http://x').searchParams.get('source') as PuzzleSourceId
      if (failing.includes(source)) return apiError(503, 'service-unavailable')
      const index = sources.indexOf(source)
      return jsonResponse(
        200,
        makePuzzleResponse(TINY, {
          puzzleId: `00000000-0000-4000-8000-00000000000${index + 1}`,
          source,
          date: '2026-10-19',
        }),
      )
    },
  })
}

afterEach(() => vi.unstubAllGlobals())

describe('downloadToday', () => {
  it('pede um dia por fonte e guarda o que veio', async () => {
    const { calls } = api()
    const summary = await downloadToday('2026-10-19')
    expect(calls).toHaveLength(sources.length)
    expect(summary).toEqual({ saved: sources.length, failed: [], storageFailed: false })
    expect(await listStoredPuzzles()).toHaveLength(sources.length)
  })

  it('uma fonte que falha não impede as outras', async () => {
    const bad = sources[0]!
    api([bad])
    const summary = await downloadToday('2026-10-19')
    expect(summary.failed).toEqual([bad])
    expect(summary.saved).toBe(sources.length - 1)
  })

  it('avisa quando o armazenamento não deixa guardar', async () => {
    api()
    vi.stubGlobal('indexedDB', undefined)
    const summary = await downloadToday('2026-10-19')
    expect(summary.saved).toBe(0)
    expect(summary.storageFailed).toBe(true)
  })
})
