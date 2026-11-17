import { eq } from 'drizzle-orm'
import { afterAll, beforeEach, describe, expect, it } from 'vitest'
import { runCli } from '../cli/run-cli'
import { loadConfig } from '../config'
import { createGeneratedSources } from '../generated-sources'
import { puzzles, rateLimitAttempts, sourceSettings } from '../platform/db/schema'
import { todayInSaoPaulo } from '../platform/lib/dates'
import { chatCompletion, sampleContent } from '../sources/generated/fixtures'
import { buildTestApp } from './app'
import { fakeSource } from './fake-source'
import { openTestDatabase, testClock, truncateAll, type TestClock } from './database'

// Feature 064: a fonte casa de ponta a ponta com o banco real e o modelo simulado.

const handle = openTestDatabase()
const { db } = handle
let clock: TestClock
let replies: { status: number; body: unknown }[]
let modelCalls: number
let out: string
let err: string

const today = () => todayInSaoPaulo(clock.now)
const good = () => ({ status: 200, body: chatCompletion(sampleContent()) })
const badList = () => ({ status: 200, body: chatCompletion(JSON.stringify({ words: [] })) })

const fakeModel = (async () => {
  modelCalls++
  const reply = replies.shift() ?? badList()
  return new Response(JSON.stringify(reply.body), { status: reply.status })
}) as unknown as typeof globalThis.fetch

beforeEach(async () => {
  await truncateAll(db)
  clock = testClock()
  replies = []
  modelCalls = 0
  out = ''
  err = ''
})
afterAll(() => handle.close())

const generation = (overrides: Record<string, string> = {}) =>
  loadConfig({
    DATABASE_URL: 'postgres://nao-usado@localhost:1/db',
    GENERATION_ENABLED: 'true',
    DEEPSEEK_API_KEY: 'chave-de-teste',
    ...overrides,
  }).generation

function collect(env: Record<string, string> = {}, others = [fakeSource()]) {
  return runCli(['puzzles', 'collect'], {
    db,
    clock: clock.now,
    sources: [
      ...others,
      ...createGeneratedSources({
        db,
        generation: generation(env),
        clock: clock.now,
        fetch: fakeModel,
      }),
    ],
    historyDays: 0,
    purgeSessions: async () => 0,
    readSecret: async () => '',
    stdout: (text) => {
      out += text
    },
    stderr: (text) => {
      err += text
    },
  })
}

const casaRows = () => db.select().from(puzzles).where(eq(puzzles.source, 'casa'))

describe('coleta da Casa (feature 064)', () => {
  it('grava a cruzada de hoje e, de novo no mesmo dia, não chama o modelo', async () => {
    replies = [good()]
    expect(await collect()).toBe(0)
    expect(await casaRows()).toHaveLength(1)
    expect(out).toContain(`Gravados: ${today()}`)
    expect(modelCalls).toBe(1)

    expect(await collect()).toBe(0)
    expect(out).toContain('Coleta Casa: 0 gravados, 1 já existentes')
    expect(modelCalls).toBe(1)
  })

  it('duas coletas que falham somam no máximo 3 chamadas no dia', async () => {
    expect(await collect()).toBe(1)
    expect(await collect()).toBe(0)
    expect(modelCalls).toBe(3)
    expect(out).toContain(`[Casa] Pulado em ${today()}: limite do dia`)
    expect(await db.select().from(rateLimitAttempts)).toHaveLength(3)
  })

  it('duas coletas ao mesmo tempo salvam uma cruzada só', async () => {
    replies = [good(), good()]
    await Promise.all([collect(), collect()])
    expect(await casaRows()).toHaveLength(1)
    expect(modelCalls).toBeLessThanOrEqual(3)
  })

  it('gera também com a Casa escondida no painel (FR-027)', async () => {
    await db.insert(sourceSettings).values({ sourceId: 'casa', visible: false, position: 0 })
    replies = [good()]
    expect(await collect()).toBe(0)
    expect(await casaRows()).toHaveLength(1)
  })

  it('uma falha da Casa não impede as outras fontes', async () => {
    const other = fakeSource()
    expect(await collect({}, [other])).toBe(1)
    expect(other.calls).toEqual([today()])
  })
})

describe('coleta da Casa para sem barulho (US3)', () => {
  it('402: uma chamada, "Pulado em ... sem créditos" no stdout e exit 0', async () => {
    replies = [{ status: 402, body: {} }]
    expect(await collect()).toBe(0)
    expect(modelCalls).toBe(1)
    expect(out).toContain(`[Casa] Pulado em ${today()}: sem créditos`)
    expect(err).not.toContain('Falhou em')
    expect(await casaRows()).toHaveLength(0)
  })

  it('sem chave ou geração desligada: nenhuma chamada e exit 0', async () => {
    expect(await collect({ DEEPSEEK_API_KEY: '' })).toBe(0)
    expect(out).toContain(`[Casa] Pulado em ${today()}: sem chave`)
    expect(await collect({ GENERATION_ENABLED: 'false' })).toBe(0)
    expect(out).toContain(`[Casa] Pulado em ${today()}: geração desligada`)
    expect(modelCalls).toBe(0)
  })

  it('401: "Falhou em ... refused" e exit 1', async () => {
    replies = [{ status: 401, body: {} }]
    expect(await collect()).toBe(1)
    expect(err).toContain(`[Casa] Falhou em ${today()}: refused`)
    expect(out + err).not.toContain('chave-de-teste')
  })
})

describe('GET /api/puzzles da Casa', () => {
  it('sem cruzada salva responde indisponível sem chamar o modelo; com ela, entrega', async () => {
    await db.insert(sourceSettings).values({ sourceId: 'casa', visible: true, position: 0 })
    const app = buildTestApp({ database: db, clock: clock.now })
    const url = `/api/puzzles?date=${today()}&source=casa`
    expect((await app.inject({ method: 'GET', url })).statusCode).toBe(404)
    expect(modelCalls).toBe(0)

    replies = [good()]
    await collect()
    const response = await app.inject({ method: 'GET', url })
    expect(response.statusCode).toBe(200)
    expect(response.json().puzzle.attribution.sourceName).toBe('Casa')
    await app.close()
  })

  it('escondida, responde como as outras fontes escondidas', async () => {
    const app = buildTestApp({ database: db, clock: clock.now })
    const response = await app.inject({
      method: 'GET',
      url: `/api/puzzles?date=${today()}&source=casa`,
    })
    expect(response.statusCode).toBe(400)
    await app.close()
  })
})
