import type { FastifyInstance } from 'fastify'
import { afterAll, afterEach, beforeEach, describe, expect, it } from 'vitest'
import { buildTestApp, signUpForTest } from './app'
import { openTestDatabase, testClock, truncateAll } from './database'
import { fakeSource, okResult } from './fake-source'
import { body, putSources, storePuzzle } from './admin-sources.support'

const handle = openTestDatabase()
const { db } = handle

let app: FastifyInstance
let admin: string
let user: string
let puzzleId: string

const rules = {
  helpMode: 'free',
  helpPenaltyMs: null,
  maxMs: null,
  startDeadlineHours: 24,
}

const post = (url: string, payload: object, sid?: string) =>
  app.inject({ method: 'POST', url, payload, headers: sid ? { cookie: `sid=${sid}` } : {} })

beforeEach(async () => {
  await truncateAll(db)
  app = buildTestApp({
    database: db,
    clock: testClock().now,
    puzzleSources: [fakeSource()],
    rateLimits: undefined,
  })
  admin = await signUpForTest(app, db, 'admin@exemplo.com', 'senha-boa-123', { isAdmin: true })
  user = await signUpForTest(app, db, 'ana@exemplo.com', 'senha-boa-123')
  puzzleId = await storePuzzle(db, '2026-10-13', 'cruzadaonline')
})
afterEach(() => app.close())
afterAll(() => handle.close())

describe('fonte escondida não apaga nem bloqueia o que já existe (FR-013)', () => {
  it('progresso salvo continua lido, importação aceita e estatísticas respondem', async () => {
    const cells = okResult('2026-10-13').puzzle.grid.cells.map((row) => row.map(() => null))
    const saved = await app.inject({
      method: 'PUT',
      url: `/api/progress/${puzzleId}`,
      headers: { cookie: `sid=${user}` },
      payload: {
        cells,
        elapsedMs: 1000,
        status: 'in_progress',
        savedAt: new Date(Date.now() - 60_000).toISOString(),
      },
    })
    expect(saved.statusCode).toBe(200)

    await putSources(app, body({ cruzadaonline: false }), admin)

    const read = await app.inject({
      method: 'GET',
      url: `/api/progress/${puzzleId}`,
      headers: { cookie: `sid=${user}` },
    })
    expect(read.statusCode).toBe(200)

    const stats = await app.inject({
      method: 'GET',
      url: '/api/stats',
      headers: { cookie: `sid=${user}` },
    })
    expect(stats.statusCode).toBe(200)

    const other = await storePuzzle(db, '2026-10-12', 'cruzadaonline')
    const imported = await post(
      '/api/progress/import',
      {
        items: [
          {
            puzzleId: other,
            cells,
            elapsedMs: 2000,
            status: 'in_progress',
            savedAt: new Date(Date.now() - 30_000).toISOString(),
            completedAt: null,
            finishedMs: null,
            bestMs: null,
            bestAt: null,
          },
        ],
      },
      user,
    )
    expect(imported.statusCode).toBe(200)
    expect(imported.json().results[0]?.result).toBe('imported')
  })

  it('um convite de x1 ainda não aberto segue inteiro; só um x1 novo recusa a fonte', async () => {
    const created = await post('/api/duels', { puzzleId, rules, nickname: 'Ana' })
    expect(created.statusCode).toBe(200)
    const { linkToken, code, participantToken } = created.json()

    await putSources(app, body({ cruzadaonline: false }), admin)

    const byCode = await post('/api/duels/lookup', { code })
    expect(byCode.statusCode).toBe(200)
    const byLink = await post('/api/duels/lookup', { linkToken })
    expect(byLink.statusCode).toBe(200)

    const started = await post('/api/duels/start', { linkToken, nickname: 'Beto' })
    expect(started.statusCode).toBe(200)
    const guest = started.json().participantToken
    const state = await post('/api/duels/state', { linkToken, participantToken: guest })
    expect(state.statusCode).toBe(200)
    const own = await post('/api/duels/state', { linkToken, participantToken })
    expect(own.statusCode).toBe(200)

    const fresh = await post('/api/duels', { puzzleId, rules, nickname: 'Ana' })
    expect(fresh.statusCode).toBe(404)
    expect(fresh.json()).toMatchObject({ error: 'puzzle-unavailable' })
  })
})
