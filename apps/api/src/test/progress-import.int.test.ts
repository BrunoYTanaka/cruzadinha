import type { ProgressCells } from '@cruzadinha/shared'
import { sql } from 'drizzle-orm'
import type { FastifyInstance } from 'fastify'
import { afterAll, afterEach, beforeEach, describe, expect, it } from 'vitest'
import { insertPuzzleIfAbsent } from '../modules/puzzles/puzzles.repository'
import { todayInSaoPaulo } from '../platform/lib/dates'
import { defaultRateLimits } from '../platform/rate-limit'
import { buildTestApp, signUpForTest } from './app'
import { openTestDatabase, testClock, truncateAll, type TestClock } from './database'
import { fakeSource, okResult } from './fake-source'

const handle = openTestDatabase()
const { db } = handle

let clock: TestClock
let app: FastifyInstance
let puzzleId: string
let emptyCells: ProgressCells
let openAt: { row: number; col: number }

const at = (seconds: number) => new Date(clock.now().getTime() + seconds * 1000).toISOString()
const letter = (value: string | null): ProgressCells =>
  emptyCells.map((row, r) =>
    row.map((cell, c) => (r === openAt.row && c === openAt.col ? value : cell)),
  )

const item = (overrides: Record<string, unknown> = {}) => ({
  puzzleId,
  cells: letter('A'),
  elapsedMs: 50_000,
  status: 'in_progress',
  savedAt: at(-60),
  completedAt: null,
  finishedMs: null,
  bestMs: null,
  bestAt: null,
  ...overrides,
})

const completedItem = (overrides: Record<string, unknown> = {}) =>
  item({
    status: 'completed',
    completedAt: at(-60),
    finishedMs: 50_000,
    bestMs: 50_000,
    bestAt: at(-60),
    ...overrides,
  })

const asUser = (sid?: string) => (sid ? { cookie: `sid=${sid}` } : {})

const importItems = (items: unknown[], sid?: string) =>
  app.inject({
    method: 'POST',
    url: '/api/progress/import',
    headers: asUser(sid),
    payload: { items },
  })

const putProgress = (payload: object, sid: string) =>
  app.inject({
    method: 'PUT',
    url: `/api/progress/${puzzleId}`,
    headers: asUser(sid),
    payload,
  })

const getProgress = async (sid: string) =>
  (
    await app.inject({ method: 'GET', url: `/api/progress/${puzzleId}`, headers: asUser(sid) })
  ).json().progress

const register = (email: string) => signUpForTest(app, db, email, 'senha-boa-123')

beforeEach(async () => {
  await truncateAll(db)
  clock = testClock()
  app = buildTestApp({ database: db, clock: clock.now, puzzleSources: [fakeSource()] })
  const ok = okResult(todayInSaoPaulo(clock.now))
  puzzleId = (await insertPuzzleIfAbsent(db, { puzzle: ok.puzzle, solution: ok.solution })).puzzleId
  emptyCells = ok.puzzle.grid.cells.map((row) => row.map(() => null))
  const open = ok.puzzle.grid.cells
    .flatMap((row, r) => row.map((cell, c) => ({ kind: cell.kind, row: r, col: c })))
    .find((p) => p.kind === 'open')
  if (!open) throw new Error('a fixture precisa de célula aberta')
  openAt = { row: open.row, col: open.col }
})
afterEach(() => app.close())
afterAll(() => handle.close())

describe('POST /api/progress/import', () => {
  it('importa para uma conta sem progresso', async () => {
    const sid = await register('ana@exemplo.com')
    const response = await importItems([item()], sid)

    expect(response.statusCode).toBe(200)
    expect(response.json()).toMatchObject({ imported: 1, kept: 0, rejected: 0 })
    expect(await getProgress(sid)).toMatchObject({ cells: letter('A'), elapsedMs: 50_000 })
  })

  it('importa uma cruzada concluída com tempo e recorde', async () => {
    const sid = await register('ana@exemplo.com')
    await importItems([completedItem()], sid)

    expect(await getProgress(sid)).toMatchObject({
      status: 'completed',
      finishedMs: 50_000,
      bestMs: 50_000,
    })
  })

  it('o salvamento mais novo vence: do aparelho sobre o antigo da conta', async () => {
    const sid = await register('ana@exemplo.com')
    await putProgress(
      { cells: letter('B'), elapsedMs: 1000, status: 'in_progress', savedAt: at(-300) },
      sid,
    )
    const response = await importItems([item({ savedAt: at(-60) })], sid)

    expect(response.json()).toMatchObject({ imported: 1 })
    expect((await getProgress(sid)).cells).toEqual(letter('A'))
  })

  it('o salvamento mais novo vence: a conta mantém o seu', async () => {
    const sid = await register('ana@exemplo.com')
    await putProgress(
      { cells: letter('B'), elapsedMs: 1000, status: 'in_progress', savedAt: at(-30) },
      sid,
    )
    const response = await importItems([item({ savedAt: at(-60) })], sid)

    expect(response.json()).toMatchObject({ kept: 1, imported: 0 })
    expect((await getProgress(sid)).cells).toEqual(letter('B'))
  })

  it('cruzada concluída na conta nunca é sobrescrita', async () => {
    const sid = await register('ana@exemplo.com')
    await putProgress(
      { cells: letter('B'), elapsedMs: 9000, status: 'completed', savedAt: at(-300) },
      sid,
    )
    const before = await getProgress(sid)
    const response = await importItems([item({ savedAt: at(-10) })], sid)

    expect(response.json()).toMatchObject({ kept: 1 })
    expect(await getProgress(sid)).toEqual(before)
  })

  it('lote misto: o item ruim não derruba os outros', async () => {
    const sid = await register('ana@exemplo.com')
    const response = await importItems(
      [item(), item({ puzzleId: '0b9a3a4e-6d0e-4b6c-9a52-1f2e3d4c5b6a' })],
      sid,
    )

    expect(response.json()).toMatchObject({ imported: 1, rejected: 1 })
    expect(response.json().results[1]).toMatchObject({
      result: 'rejected',
      reason: 'puzzle-unavailable',
    })
  })

  it('grade que não bate e savedAt no futuro são recusados por item', async () => {
    const sid = await register('ana@exemplo.com')
    const response = await importItems(
      [item({ cells: [[null]] }), item({ savedAt: at(3600) })],
      sid,
    )
    // O mesmo puzzleId repetido é erro de corpo; testa um de cada vez.
    expect(response.statusCode).toBe(400)

    const badGrid = await importItems([item({ cells: [[null]] })], sid)
    expect(badGrid.json().results[0]).toMatchObject({ result: 'rejected', reason: 'invalid-input' })
    const future = await importItems([item({ savedAt: at(3600) })], sid)
    expect(future.json().results[0]).toMatchObject({ result: 'rejected', reason: 'invalid-input' })
  })

  it('reenviar o mesmo corpo é idempotente', async () => {
    const sid = await register('ana@exemplo.com')
    await importItems([item()], sid)
    const first = await getProgress(sid)
    const second = await importItems([item()], sid)

    expect(second.json()).toMatchObject({ kept: 1, imported: 0 })
    expect(await getProgress(sid)).toEqual(first)
  })

  it('uma conta nunca toca as linhas de outra', async () => {
    const ana = await register('ana@exemplo.com')
    const bia = await register('bia@exemplo.com')
    await importItems([item()], ana)

    expect(await getProgress(bia)).toBeNull()
    const rows = await db.execute<{ total: number }>(
      sql`SELECT count(*)::int AS total FROM progress`,
    )
    expect(rows[0]?.total).toBe(1)
  })

  it('recusa sem sessão (401), com corpo inválido (400) e acima do limite (429)', async () => {
    expect((await importItems([item()])).statusCode).toBe(401)

    const sid = await register('ana@exemplo.com')
    expect((await importItems([item({ help: {} })], sid)).statusCode).toBe(400)
    expect((await importItems([], sid)).statusCode).toBe(400)

    app.close()
    app = buildTestApp({
      database: db,
      clock: clock.now,
      puzzleSources: [fakeSource()],
      rateLimits: { ...defaultRateLimits, progressSave: { max: 1, windowMinutes: 60 } },
    })
    const other = await register('bia@exemplo.com')
    expect((await importItems([item()], other)).statusCode).toBe(200)
    const blocked = await importItems([item()], other)
    expect(blocked.statusCode).toBe(429)
    expect(Number(blocked.headers['retry-after'])).toBeGreaterThan(0)
  })
})
