import type { Progress, SaveProgressRequest } from '@cruzadinha/shared'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { apiError, jsonResponse, mockApi } from '../../../../test/http'
import { makeProgress, makePuzzleResponse, TINY } from '../../../../test/fixtures'
import { readKnownProgress, savePuzzle } from '../offline-store/offline-store'
import { applyOutboxEvent, readOutboxItems } from '../outbox/outbox'
import { drainOutboxes } from './drain'

const USER = '3f1c9a52-1a2b-4c3d-8e4f-0123456789ab'
const P1 = '00000000-0000-4000-8000-000000000001'
const P2 = '00000000-0000-4000-8000-000000000002'
const at = (s: number) => new Date(Date.UTC(2026, 9, 16, 12, 0, s)).toISOString()
const body = (s: number): SaveProgressRequest => ({
  cells: [['A', null]],
  elapsedMs: s * 1000,
  status: 'in_progress',
  savedAt: at(s),
})
const envelope = (puzzleId: string, over: Partial<Progress> = {}) =>
  jsonResponse(200, { progress: makeProgress({ puzzleId, ...over }) })
const noSleep = () => Promise.resolve()
const SAVE = (id: string) => `PUT /api/progress/${id}`
const RESET = (id: string) => `POST /api/progress/${id}/reset`
const GET = (id: string) => `GET /api/progress/${id}`

beforeEach(() => localStorage.clear())

describe('drainOutboxes', () => {
  it('envia na ordem do savedAt, apaga ao confirmar e guarda o progresso conhecido', async () => {
    await savePuzzle(makePuzzleResponse(TINY, { puzzleId: P1 }))
    applyOutboxEvent(USER, P2, { type: 'save', body: body(5) })
    applyOutboxEvent(USER, P1, { type: 'save', body: body(2) })
    const { calls } = mockApi({
      [SAVE(P1)]: () => envelope(P1),
      [SAVE(P2)]: () => envelope(P2),
    })
    await drainOutboxes(USER, { sleep: noSleep })
    expect(calls.map((c) => c.key)).toEqual([SAVE(P1), SAVE(P2)])
    expect(readOutboxItems(USER, P1)).toEqual([])
    expect(readOutboxItems(USER, P2)).toEqual([])
    expect(await readKnownProgress(USER, P1)).not.toBeNull()
  })

  it('manda o reinício antes do salvamento seguinte', async () => {
    applyOutboxEvent(USER, P1, { type: 'reset', at: at(3) })
    applyOutboxEvent(USER, P1, { type: 'save', body: body(4) })
    const { calls } = mockApi({
      [GET(P1)]: () => jsonResponse(200, { progress: null }),
      [RESET(P1)]: () => envelope(P1),
      [SAVE(P1)]: () => envelope(P1),
    })
    await drainOutboxes(USER, { sleep: noSleep })
    expect(calls.map((c) => c.key)).toEqual([GET(P1), RESET(P1), SAVE(P1)])
    expect(readOutboxItems(USER, P1)).toEqual([])
  })

  it('descarta o reinício se o servidor tem progresso mais novo, mantendo o salvamento', async () => {
    applyOutboxEvent(USER, P1, { type: 'reset', at: at(3) })
    applyOutboxEvent(USER, P1, { type: 'save', body: body(4) })
    const { calls } = mockApi({
      [GET(P1)]: () => envelope(P1, { savedAt: at(9) }),
      [SAVE(P1)]: () => apiError(409, 'progress-completed'),
    })
    await drainOutboxes(USER, { sleep: noSleep })
    expect(calls.some((c) => c.key === RESET(P1))).toBe(false)
    expect(readOutboxItems(USER, P1)).toEqual([])
  })

  it('manda o reinício quando o servidor é mais antigo ou não tem registro', async () => {
    applyOutboxEvent(USER, P1, { type: 'reset', at: at(8) })
    const { calls } = mockApi({
      [GET(P1)]: () => envelope(P1, { savedAt: at(1) }),
      [RESET(P1)]: () => envelope(P1),
    })
    await drainOutboxes(USER, { sleep: noSleep })
    expect(calls.some((c) => c.key === RESET(P1))).toBe(true)
  })

  it('para no 401 e mantém tudo', async () => {
    applyOutboxEvent(USER, P1, { type: 'save', body: body(2) })
    applyOutboxEvent(USER, P2, { type: 'save', body: body(5) })
    const { calls } = mockApi({ [SAVE(P1)]: () => apiError(401, 'unauthenticated') })
    await drainOutboxes(USER, { sleep: noSleep })
    expect(calls).toHaveLength(1)
    expect(readOutboxItems(USER, P1)).toHaveLength(1)
    expect(readOutboxItems(USER, P2)).toHaveLength(1)
  })

  it('repete 5xx com espera e termina quando o servidor responde', async () => {
    applyOutboxEvent(USER, P1, { type: 'save', body: body(2) })
    let n = 0
    const sleep = vi.fn<(ms: number) => Promise<void>>(() => Promise.resolve())
    mockApi({ [SAVE(P1)]: () => (++n < 3 ? apiError(503, 'service-unavailable') : envelope(P1)) })
    await drainOutboxes(USER, { sleep })
    expect(sleep.mock.calls.map((c) => c[0])).toEqual([1000, 2000])
    expect(readOutboxItems(USER, P1)).toEqual([])
  })

  it('409 progress-completed descarta o salvamento', async () => {
    applyOutboxEvent(USER, P1, { type: 'save', body: body(2) })
    mockApi({ [SAVE(P1)]: () => apiError(409, 'progress-completed') })
    await drainOutboxes(USER, { sleep: noSleep })
    expect(readOutboxItems(USER, P1)).toEqual([])
  })

  it('pula a cruzada aberta nesta aba e as de outra conta', async () => {
    applyOutboxEvent(USER, P1, { type: 'save', body: body(2) })
    applyOutboxEvent('other-user', P2, { type: 'save', body: body(3) })
    const { calls } = mockApi({})
    await drainOutboxes(USER, { skipPuzzleId: P1, sleep: noSleep })
    expect(calls).toHaveLength(0)
    expect(readOutboxItems(USER, P1)).toHaveLength(1)
  })

  it('não roda quando outra aba segura o lock, e roda sem a API de locks', async () => {
    applyOutboxEvent(USER, P1, { type: 'save', body: body(2) })
    const { calls } = mockApi({ [SAVE(P1)]: () => envelope(P1) })
    const request = vi.fn(async (_n: string, _o: unknown, cb: (l: Lock | null) => Promise<void>) =>
      cb(null),
    )
    vi.stubGlobal('navigator', { ...navigator, locks: { request } })
    await drainOutboxes(USER, { sleep: noSleep })
    expect(calls).toHaveLength(0)
    vi.stubGlobal('navigator', { ...navigator, locks: undefined })
    await drainOutboxes(USER, { sleep: noSleep })
    expect(calls).toHaveLength(1)
    vi.unstubAllGlobals()
  })
})
