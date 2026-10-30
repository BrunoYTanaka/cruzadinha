import { statsSchema } from '@cruzadinha/shared'
import type { FastifyInstance } from 'fastify'
import { afterAll, afterEach, beforeEach, describe, expect, it } from 'vitest'
import { progress, puzzles } from '../platform/db/schema'
import { buildTestApp, signUpForTest } from './app'
import { openTestDatabase, testClock, truncateAll } from './database'
import { okResult } from './fake-source'

const handle = openTestDatabase()
const { db } = handle

let app: FastifyInstance
let clockNow: () => Date

beforeEach(async () => {
  await truncateAll(db)
  const clock = testClock()
  clockNow = clock.now
  app = buildTestApp({ database: db, clock: clock.now })
})
afterEach(() => app.close())
afterAll(() => handle.close())

const getStats = (sid?: string) =>
  app.inject({ method: 'GET', url: '/api/stats', headers: sid ? { cookie: `sid=${sid}` } : {} })

async function userIdOf(sid: string): Promise<string> {
  const me = await app.inject({
    method: 'GET',
    url: '/api/auth/me',
    headers: { cookie: `sid=${sid}` },
  })
  return me.json<{ user: { id: string } }>().user.id
}

async function complete(userId: string, date: string, finishedMs: number) {
  const ok = okResult(date)
  const [row] = await db
    .insert(puzzles)
    .values({
      source: ok.puzzle.source,
      level: ok.puzzle.level,
      date,
      data: ok.puzzle,
      solution: ok.solution,
    })
    .returning({ puzzleId: puzzles.puzzleId })
  await db.insert(progress).values({
    userId,
    puzzleId: row!.puzzleId,
    cells: ok.puzzle.grid.cells.map((r) => r.map(() => null)),
    elapsedMs: finishedMs,
    status: 'completed',
    savedAt: clockNow(),
    completedAt: clockNow(),
    finishedMs,
    bestMs: finishedMs,
    bestAt: clockNow(),
  })
}

describe('GET /api/stats', () => {
  it('exige sessão', async () => {
    expect((await getStats()).statusCode).toBe(401)
  })

  it('devolve zeros para uma conta sem progresso', async () => {
    const sid = await signUpForTest(app, db, 'ana@exemplo.com', 'senha-boa-123')
    const body = statsSchema.parse((await getStats(sid)).json())
    expect(body.total).toBe(0)
    expect(body.averageMs).toBeNull()
    expect(body.streak).toEqual({ current: 0, longest: 0 })
  })

  it('calcula só o progresso da própria conta e nunca expõe letras', async () => {
    const ana = await signUpForTest(app, db, 'ana@exemplo.com', 'senha-boa-123')
    const bia = await signUpForTest(app, db, 'bia@exemplo.com', 'senha-boa-123')
    await complete(await userIdOf(ana), '2026-10-12', 60_000)
    await complete(await userIdOf(bia), '2026-10-13', 90_000)

    const response = await getStats(ana)
    const body = statsSchema.parse(response.json())
    expect(body.total).toBe(1)
    expect(body.averageMs).toBe(60_000)
    expect(body.streak.current).toBe(1)
    expect(response.body).not.toContain('cells')
  })
})
