import type { FastifyInstance } from 'fastify'
import { eq } from 'drizzle-orm'
import { afterAll, afterEach, beforeEach, describe, expect, it } from 'vitest'
import { generationCallKey } from '../modules/sources'
import { insertPuzzleIfAbsent } from '../modules/puzzles/puzzles.repository'
import { duels, progress, puzzles, rateLimitAttempts, users } from '../platform/db/schema'
import { addDaysToIsoDate, todayInSaoPaulo } from '../platform/lib/dates'
import { buildCasaSample } from '../sources/generated/fixtures'
import { buildTestApp, signUpForTest } from './app'
import { openTestDatabase, testClock, truncateAll, type TestClock } from './database'

// Feature 064: painel das fontes geradas (contracts/admin-generated-sources.md).

const handle = openTestDatabase()
const { db } = handle

let app: FastifyInstance
let clock: TestClock
let admin: string
let member: string

beforeEach(async () => {
  await truncateAll(db)
  clock = testClock()
  app = buildTestApp({ database: db, clock: clock.now })
  admin = await signUpForTest(app, db, 'admin@exemplo.com', 'senha-boa-123', { isAdmin: true })
  member = await signUpForTest(app, db, 'ana@exemplo.com', 'senha-boa-123')
})
afterEach(() => app.close())
afterAll(() => handle.close())

const today = () => todayInSaoPaulo(clock.now)

function call(method: 'GET' | 'PUT' | 'POST', url: string, sid?: string, payload?: object) {
  return app.inject({ method, url, headers: sid ? { cookie: `sid=${sid}` } : {}, payload })
}

async function storeCasa(date = today()) {
  const built = buildCasaSample({ source: 'casa', date, size: 9, difficulty: 'easy', seed: 'a' })
  return (await insertPuzzleIfAbsent(db, built)).puzzleId
}

const settings = (payload: object) =>
  call('PUT', '/api/admin/generated/settings', admin, { source: 'casa', ...payload })
const discard = (puzzleId: string, sid = admin) =>
  call('POST', '/api/admin/generated/discard', sid, { source: 'casa', puzzleId })

describe('configuração das fontes geradas (US4)', () => {
  it('lê o padrão 11/medium, salva 13/hard e lê de volta', async () => {
    const before = (await call('GET', '/api/admin/generated', admin)).json()
    expect(before.sources).toEqual([
      { source: 'casa', gridSize: 11, difficulty: 'medium', callsLeft: 3, today: null },
    ])
    const saved = await settings({ gridSize: 13, difficulty: 'hard' })
    expect(saved.statusCode).toBe(200)
    expect(saved.json()).toMatchObject({ source: 'casa', gridSize: 13, difficulty: 'hard' })
    const after = (await call('GET', '/api/admin/generated', admin)).json()
    expect(after.sources[0]).toMatchObject({ gridSize: 13, difficulty: 'hard' })
  })

  it.each([
    ['tamanho 8', { gridSize: 8, difficulty: 'easy' }],
    ['tamanho 16', { gridSize: 16, difficulty: 'easy' }],
    ['tamanho fracionado', { gridSize: 11.5, difficulty: 'easy' }],
    ['dificuldade desconhecida', { gridSize: 11, difficulty: 'extreme' }],
    ['fonte que não é gerada', { source: 'oglobo', gridSize: 11, difficulty: 'easy' }],
    ['chave a mais', { gridSize: 11, difficulty: 'easy', extra: 1 }],
  ])('recusa %s sem mudar nada', async (_, payload) => {
    const response = await settings(payload)
    expect(response.statusCode).toBe(400)
    expect(response.json().error).toBe('invalid-input')
    const view = (await call('GET', '/api/admin/generated', admin)).json()
    expect(view.sources[0]).toMatchObject({ gridSize: 11, difficulty: 'medium' })
  })

  it.each([
    ['sem sessão', undefined],
    ['conta comum', 'member'],
  ])('responde 404 de rota inexistente %s', async (_, who) => {
    const sid = who ? member : undefined
    expect((await call('GET', '/api/admin/generated', sid)).statusCode).toBe(404)
    const put = await call('PUT', '/api/admin/generated/settings', sid, {
      source: 'casa',
      gridSize: 9,
      difficulty: 'easy',
    })
    expect(put.statusCode).toBe(404)
    expect((await call('POST', '/api/admin/generated/discard', sid, {})).statusCode).toBe(404)
  })
})

describe('revisão e descarte da cruzada de hoje (US5)', () => {
  it('mostra palavras, respostas e chamadas restantes', async () => {
    await storeCasa()
    await db.insert(rateLimitAttempts).values({ ...generationCallKey('casa', today()) })
    const view = (await call('GET', '/api/admin/generated', admin)).json().sources[0]
    expect(view.callsLeft).toBe(2)
    expect(view.today).toMatchObject({ size: 9, discardable: true, blockedBy: null })
    const answers = buildCasaSample({
      source: 'casa',
      date: today(),
      size: 9,
      difficulty: 'easy',
      seed: 'a',
    }).grid.words.map((w) => w.plain)
    expect(view.today.words.map((w: { answer: string }) => w.answer).sort()).toEqual(
      [...answers].sort(),
    )
    // Grade densa: uma entrada por palavra, horizontais e verticais (US4).
    expect(view.today.words.length).toBe(answers.length)
    expect(view.today.words.length).toBeGreaterThan(20)
  })

  it('descarta sem uso: o dia fica vazio e as chamadas não voltam', async () => {
    const puzzleId = await storeCasa()
    await db.insert(rateLimitAttempts).values({ ...generationCallKey('casa', today()) })
    const response = await discard(puzzleId)
    expect(response.statusCode).toBe(200)
    expect(response.json()).toEqual({ discarded: true })
    expect(await db.select().from(puzzles)).toHaveLength(0)
    const view = (await call('GET', '/api/admin/generated', admin)).json().sources[0]
    expect(view).toMatchObject({ today: null, callsLeft: 2 })
  })

  it('recusa com progresso de conta (409, blockedBy progress)', async () => {
    const puzzleId = await storeCasa()
    const [ana] = await db.select().from(users).where(eq(users.email, 'ana@exemplo.com'))
    await db.insert(progress).values({
      userId: ana!.userId,
      puzzleId,
      cells: Array.from({ length: 9 }, () => Array(9).fill(null)),
      elapsedMs: 1000,
      status: 'in_progress',
      savedAt: clock.now(),
    })
    const view = (await call('GET', '/api/admin/generated', admin)).json().sources[0]
    expect(view.today).toMatchObject({ discardable: false, blockedBy: 'progress' })
    const response = await discard(puzzleId)
    expect(response.statusCode).toBe(409)
    expect(response.json().error).toBe('in-use')
    expect(await db.select().from(puzzles)).toHaveLength(1)
  })

  it('recusa com x1 (409, blockedBy duel)', async () => {
    const puzzleId = await storeCasa()
    await db.insert(duels).values({
      puzzleId,
      helpMode: 'free',
      state: 'open',
      linkToken: 'link-casa',
      code: 'CASAAAAA',
      startDeadlineAt: clock.now(),
    })
    const view = (await call('GET', '/api/admin/generated', admin)).json().sources[0]
    expect(view.today).toMatchObject({ blockedBy: 'duel' })
    expect((await discard(puzzleId)).statusCode).toBe(409)
  })

  it('não descarta a cruzada de ontem nem um id qualquer (404)', async () => {
    const yesterday = await storeCasa(addDaysToIsoDate(today(), -1))
    const response = await discard(yesterday)
    expect(response.statusCode).toBe(404)
    expect(response.json().error).toBe('puzzle-unavailable')
    expect((await discard('0b7d6c43-6f1d-4f6c-9a50-2f0d3a1b9c11')).statusCode).toBe(404)
    expect((await call('POST', '/api/admin/generated/discard', admin, {})).statusCode).toBe(400)
  })
})
