import type { FastifyInstance } from 'fastify'
import { Writable } from 'node:stream'
import { afterAll, afterEach, beforeEach, describe, expect, it } from 'vitest'
import { puzzles } from '../db/schema'
import { addDaysToIsoDate, todayInSaoPaulo } from '../lib/dates'
import { defaultRateLimits, type RateLimits } from '../modules/rate-limit/limits'
import type { FetchPuzzleResult } from '../sources/types'
import { buildTestApp, sessionCookieFrom } from './app'
import { fakeSource, okResult, type FakeSource } from './fake-source'
import { openTestDatabase, testClock, truncateAll, type TestClock } from './database'

const handle = openTestDatabase()
const { db } = handle

let clock: TestClock
let app: FastifyInstance
let source: FakeSource
let cruzada: FakeSource
let cookie: string

const today = () => todayInSaoPaulo(clock.now)
const daysAgo = (days: number) => addDaysToIsoDate(today(), -days)

let logged: string[]

async function start(
  responses: Map<string, FetchPuzzleResult> = new Map(),
  rateLimits: RateLimits = defaultRateLimits,
  cruzadaResponses: Map<string, FetchPuzzleResult> = new Map(),
) {
  source = fakeSource(responses)
  cruzada = fakeSource(cruzadaResponses, { id: 'cruzadaonline' })
  logged = []
  const logStream = new Writable({
    write(chunk, _encoding, done) {
      logged.push(String(chunk))
      done()
    },
  })
  app = buildTestApp({
    database: db,
    clock: clock.now,
    puzzleSources: [source, cruzada],
    rateLimits,
    logStream,
  })
  const response = await app.inject({
    method: 'POST',
    url: '/api/auth/register',
    payload: { email: 'ana@exemplo.com', password: 'senha-boa-123' },
  })
  const sid = sessionCookieFrom(response.headers['set-cookie'])
  if (!sid) throw new Error('cadastro sem cookie')
  cookie = sid
}

function get(url: string, withSession = true) {
  return app.inject({ method: 'GET', url, headers: withSession ? { cookie: `sid=${cookie}` } : {} })
}

const okFor = (...dates: string[]) =>
  new Map<string, FetchPuzzleResult>(dates.map((date) => [date, okResult(date)]))

beforeEach(async () => {
  await truncateAll(db)
  clock = testClock()
})
afterEach(() => app.close())
afterAll(() => handle.close())

describe('GET /api/puzzles', () => {
  it('atende o visitante sem sessão com o puzzle e a solução (feature 013)', async () => {
    const ok = okResult(today())
    await start(new Map([[today(), ok]]))
    const response = await get(`/api/puzzles?date=${today()}`, false)

    expect(response.statusCode).toBe(200)
    expect(Object.keys(response.json()).sort()).toEqual(['puzzle', 'puzzleId', 'solution'])
    expect(response.json().solution).toEqual(ok.solution)
    expect(response.headers['set-cookie']).toBeUndefined()
  })

  it('com cookie inválido responde 401, apaga o cookie e não consulta a fonte', async () => {
    await start(okFor(today()))
    const response = await app.inject({
      method: 'GET',
      url: `/api/puzzles?date=${today()}`,
      headers: { cookie: `sid=${'A'.repeat(43)}` },
    })

    expect(response.statusCode).toBe(401)
    expect(response.body).not.toContain('solution')
    expect(response.json().error).toBe('unauthenticated')
    expect(String(response.headers['set-cookie'])).toMatch(/^sid=;.*Expires=Thu, 01 Jan 1970/)
    expect(source.calls).toEqual([])
  })

  it('o visitante conta no limite de buscas à fonte por endereço', async () => {
    const limits = { ...defaultRateLimits, puzzleFetch: { max: 1, windowMinutes: 60 } }
    await start(okFor(daysAgo(0), daysAgo(1)), limits)

    expect((await get(`/api/puzzles?date=${daysAgo(0)}`, false)).statusCode).toBe(200)
    const blocked = await get(`/api/puzzles?date=${daysAgo(1)}`, false)
    expect(blocked.statusCode).toBe(429)
    expect(source.calls).toEqual([daysAgo(0)])
  })

  it('busca na fonte, grava e devolve; a segunda chamada vem do banco', async () => {
    await start(okFor(today()))
    const first = await get(`/api/puzzles?date=${today()}`)

    expect(first.statusCode).toBe(200)
    const { puzzleId, puzzle } = first.json()
    expect(puzzleId).toMatch(/^[0-9a-f-]{36}$/)
    expect(puzzle.date).toBe(today())
    expect(puzzle.attribution.sourceName).toBe('O Globo')
    expect(await db.select().from(puzzles)).toHaveLength(1)
    expect(source.calls).toEqual([today()])

    const second = await get(`/api/puzzles?date=${today()}`)
    expect(second.statusCode).toBe(200)
    expect(second.json().puzzleId).toBe(puzzleId)
    expect(source.calls).toEqual([today()])
  })

  it('devolve a solução junto do puzzle', async () => {
    const ok = okResult(today())
    await start(new Map([[today(), ok]]))
    const response = await get(`/api/puzzles?date=${today()}`)

    expect(response.statusCode).toBe(200)
    expect(Object.keys(response.json()).sort()).toEqual(['puzzle', 'puzzleId', 'solution'])
    expect(response.json().solution).toEqual(ok.solution)
  })

  it('o puzzle buscado agora e o guardado saem com a mesma solução, sem nova busca', async () => {
    await start(okFor(today()))
    const first = await get(`/api/puzzles?date=${today()}`)
    const second = await get(`/api/puzzles?date=${today()}`)

    expect(second.json().solution).toEqual(first.json().solution)
    expect(source.calls).toEqual([today()])
  })

  it('responde 500 genérico, sem letras no corpo nem no log, se o par guardado for inconsistente', async () => {
    const ok = okResult(today())
    await start(new Map([[today(), ok]]))
    await get(`/api/puzzles?date=${today()}`)
    await db.update(puzzles).set({ solution: { cells: [['Z']] } })

    const response = await get(`/api/puzzles?date=${today()}`)
    expect(response.statusCode).toBe(500)
    expect(response.json().error).toBe('internal-error')
    expect(response.body).not.toContain('"solution"')
    expect(response.body).not.toContain('"Z"')
    expect(logged.length).toBeGreaterThan(0)
    expect(logged.join('')).not.toContain(JSON.stringify(ok.solution.cells))
    expect(logged.join('')).not.toContain('"Z"')
  })

  it('assume o nível daily quando level é omitido', async () => {
    await start(okFor(today()))
    const response = await get(`/api/puzzles?date=${today()}`)
    expect(response.json().puzzle.level).toBe('daily')
  })

  it.each([
    ['level inválido', (d: string) => `/api/puzzles?level=weekly&date=${d}`, 'level'],
    ['data inexistente', () => '/api/puzzles?date=2026-13-40', 'date'],
    ['data ausente', () => '/api/puzzles', 'date'],
  ])('responde 400 para %s sem consultar a fonte', async (_name, url, field) => {
    await start(okFor(today()))
    const response = await get(url(today()))

    expect(response.statusCode).toBe(400)
    expect(response.body).not.toContain('solution')
    expect(response.json().error).toBe('invalid-input')
    expect(response.json().fields).toContain(field)
    expect(source.calls).toEqual([])
  })

  it('responde 404 para data futura sem consultar a fonte', async () => {
    await start(okFor(addDaysToIsoDate(today(), 1)))
    const response = await get(`/api/puzzles?date=${addDaysToIsoDate(today(), 1)}`)

    expect(response.statusCode).toBe(404)
    expect(response.body).not.toContain('solution')
    expect(response.json().error).toBe('puzzle-unavailable')
    expect(source.calls).toEqual([])
  })

  it('responde 404 quando a fonte não publica a data e não grava nada', async () => {
    await start(new Map([[daysAgo(1), { ok: false, reason: 'unavailable' }]]))
    const response = await get(`/api/puzzles?date=${daysAgo(1)}`)

    expect(response.statusCode).toBe(404)
    expect(response.body).not.toContain('solution')
    expect(response.json().error).toBe('puzzle-unavailable')
    expect(await db.select().from(puzzles)).toHaveLength(0)
  })

  it('responde 502 e não grava quando a fonte devolve um puzzle inconsistente', async () => {
    const broken = { ...okResult(today()), solution: { cells: [['A']] } }
    await start(new Map([[today(), broken]]))
    const response = await get(`/api/puzzles?date=${today()}`)

    expect(response.statusCode).toBe(502)
    expect(response.body).not.toContain('solution')
    expect(response.json().error).toBe('puzzle-source-failed')
    expect(await db.select().from(puzzles)).toHaveLength(0)
  })

  it.each(['source-down', 'refused', 'unexpected-format', 'rate-limited'] as const)(
    'responde 502 sem vazar o detalhe quando a fonte falha com %s',
    async (reason) => {
      await start(new Map([[today(), { ok: false, reason, detail: 'detalhe-secreto-da-fonte' }]]))
      const response = await get(`/api/puzzles?date=${today()}`)

      expect(response.statusCode).toBe(502)
      expect(response.body).not.toContain('solution')
      expect(response.json().error).toBe('puzzle-source-failed')
      expect(response.body).not.toContain('detalhe-secreto-da-fonte')
    },
  )

  it('continua servindo o puzzle guardado quando a fonte cai', async () => {
    await start(okFor(today()))
    await get(`/api/puzzles?date=${today()}`)
    source.fetchPuzzle = async () => ({ ok: false, reason: 'source-down' })

    const response = await get(`/api/puzzles?date=${today()}`)
    expect(response.statusCode).toBe(200)
  })

  it('limita as buscas à fonte e não conta o que já está guardado', async () => {
    const limits = { ...defaultRateLimits, puzzleFetch: { max: 2, windowMinutes: 60 } }
    await start(okFor(daysAgo(0), daysAgo(1), daysAgo(2)), limits)

    expect((await get(`/api/puzzles?date=${daysAgo(0)}`)).statusCode).toBe(200)
    expect((await get(`/api/puzzles?date=${daysAgo(1)}`)).statusCode).toBe(200)
    expect((await get(`/api/puzzles?date=${daysAgo(0)}`)).statusCode).toBe(200)

    const blocked = await get(`/api/puzzles?date=${daysAgo(2)}`)
    expect(blocked.statusCode).toBe(429)
    expect(blocked.json().error).toBe('too-many-attempts')
    expect(Number(blocked.headers['retry-after'])).toBeGreaterThan(0)
    expect(source.calls).toEqual([daysAgo(0), daysAgo(1)])
  })

  it('duas chamadas simultâneas da mesma data deixam uma linha e o mesmo id', async () => {
    await start(okFor(today()))
    const [a, b] = await Promise.all([
      get(`/api/puzzles?date=${today()}`),
      get(`/api/puzzles?date=${today()}`),
    ])

    expect(a.statusCode).toBe(200)
    expect(b.statusCode).toBe(200)
    expect(a.json().puzzleId).toBe(b.json().puzzleId)
    expect(a.json().solution).toEqual(b.json().solution)
    expect(await db.select().from(puzzles)).toHaveLength(1)
  })
})

describe('GET /api/puzzles com fonte (feature 014)', () => {
  const cruzadaFor = (...dates: string[]) =>
    new Map<string, FetchPuzzleResult>(dates.map((date) => [date, okResult(date, 'cruzadaonline')]))

  it('sem fonte vale oglobo e a resposta é a de antes (SC-007)', async () => {
    await start(okFor(today()), defaultRateLimits, cruzadaFor(today()))
    const response = await get(`/api/puzzles?date=${today()}`, false)

    expect(response.statusCode).toBe(200)
    expect(Object.keys(response.json()).sort()).toEqual(['puzzle', 'puzzleId', 'solution'])
    expect(response.json().puzzle.source).toBe('oglobo')
    expect(source.calls).toEqual([today()])
    expect(cruzada.calls).toEqual([])
  })

  it('source=cruzadaonline busca só nessa fonte', async () => {
    await start(okFor(today()), defaultRateLimits, cruzadaFor(today()))
    const response = await get(`/api/puzzles?date=${today()}&source=cruzadaonline`, false)

    expect(response.statusCode).toBe(200)
    expect(response.json().puzzle.source).toBe('cruzadaonline')
    expect(response.json().puzzle.attribution.sourceName).toBe('Cruzada Online')
    expect(cruzada.calls).toEqual([today()])
    expect(source.calls).toEqual([])
  })

  it('fonte desconhecida é pedido inválido', async () => {
    await start()
    const response = await get(`/api/puzzles?date=${today()}&source=xyz`, false)

    expect(response.statusCode).toBe(400)
    expect(response.json()).toMatchObject({ error: 'invalid-input', fields: ['source'] })
  })

  it('data futura da nova fonte responde 404 sem consultar a fonte', async () => {
    await start(new Map(), defaultRateLimits, cruzadaFor(daysAgo(-1)))
    const response = await get(`/api/puzzles?date=${daysAgo(-1)}&source=cruzadaonline`, false)

    expect(response.statusCode).toBe(404)
    expect(cruzada.calls).toEqual([])
  })

  it('o limite de buscas por endereço é o mesmo para as duas fontes', async () => {
    const limits = { ...defaultRateLimits, puzzleFetch: { max: 2, windowMinutes: 60 } }
    await start(okFor(daysAgo(0), daysAgo(2)), limits, cruzadaFor(daysAgo(1)))

    expect((await get(`/api/puzzles?date=${daysAgo(0)}`, false)).statusCode).toBe(200)
    expect(
      (await get(`/api/puzzles?date=${daysAgo(1)}&source=cruzadaonline`, false)).statusCode,
    ).toBe(200)
    expect((await get(`/api/puzzles?date=${daysAgo(2)}`, false)).statusCode).toBe(429)
  })

  it('o puzzle guardado de uma fonte não é devolvido para a outra', async () => {
    await start(okFor(today()), defaultRateLimits, cruzadaFor(today()))
    const globo = (await get(`/api/puzzles?date=${today()}`, false)).json()
    const other = (await get(`/api/puzzles?date=${today()}&source=cruzadaonline`, false)).json()

    expect(other.puzzleId).not.toBe(globo.puzzleId)
    expect(cruzada.calls).toEqual([today()])
    expect(await db.select().from(puzzles)).toHaveLength(2)
  })

  it('falha da nova fonte responde 502 sem vazar o detalhe', async () => {
    const failure: FetchPuzzleResult = {
      ok: false,
      reason: 'source-down',
      detail: 'detalhe-secreto',
    }
    await start(new Map(), defaultRateLimits, new Map([[today(), failure]]))
    const response = await get(`/api/puzzles?date=${today()}&source=cruzadaonline`, false)

    expect(response.statusCode).toBe(502)
    expect(response.json().error).toBe('puzzle-source-failed')
    expect(response.body + logged.join('')).not.toContain('detalhe-secreto')
  })
})

describe('GET /api/puzzles/:id', () => {
  it('devolve o puzzle guardado sem consultar a fonte', async () => {
    await start(okFor(today()))
    const { puzzleId } = (await get(`/api/puzzles?date=${today()}`)).json()
    source.calls.length = 0

    const response = await get(`/api/puzzles/${puzzleId}`)
    expect(response.statusCode).toBe(200)
    expect(response.json().puzzleId).toBe(puzzleId)
    expect(response.json().solution).toEqual(okResult(today()).solution)
    expect(source.calls).toEqual([])
  })

  it.each(['0b9a3a4e-6d0e-4b6c-9a52-1f2e3d4c5b6a', 'nao-e-uuid'])(
    'responde 404 para o id %s',
    async (id) => {
      await start()
      const response = await get(`/api/puzzles/${id}`)

      expect(response.statusCode).toBe(404)
      expect(response.body).not.toContain('solution')
      expect(response.json().error).toBe('puzzle-unavailable')
      expect(source.calls).toEqual([])
    },
  )

  it('atende o visitante sem sessão (feature 013)', async () => {
    await start(okFor(today()))
    const { puzzleId } = (await get(`/api/puzzles?date=${today()}`)).json()
    const response = await get(`/api/puzzles/${puzzleId}`, false)
    expect(response.statusCode).toBe(200)
    expect(response.json().puzzleId).toBe(puzzleId)
    expect(response.json().solution).toBeDefined()
  })

  it('para o visitante, um id inexistente continua 404 sem solução', async () => {
    await start()
    const response = await get('/api/puzzles/0b9a3a4e-6d0e-4b6c-9a52-1f2e3d4c5b6a', false)
    expect(response.statusCode).toBe(404)
    expect(response.body).not.toContain('solution')
  })
})
