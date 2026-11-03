import { sql } from 'drizzle-orm'
import type { FastifyInstance } from 'fastify'
import { afterAll, afterEach, beforeEach, describe, expect, it } from 'vitest'
import { buildTestApp, signUpForTest } from './app'
import { openTestDatabase, testClock, truncateAll } from './database'
import { fakeSource } from './fake-source'
import { ALL, body, getSources, putSources, storePuzzle } from './admin-sources.support'

const handle = openTestDatabase()
const { db } = handle

let app: FastifyInstance
let admin: string

async function changes(): Promise<number> {
  const rows = await db.execute<{ total: number }>(
    sql`SELECT count(*)::int AS total FROM source_setting_changes`,
  )
  return rows[0]?.total ?? -1
}

beforeEach(async () => {
  await truncateAll(db)
  app = buildTestApp({
    database: db,
    clock: testClock().now,
    puzzleSources: [fakeSource()],
  })
  admin = await signUpForTest(app, db, 'admin@exemplo.com', 'senha-boa-123', { isAdmin: true })
})
afterEach(() => app.close())
afterAll(() => handle.close())

describe('esconder uma fonte', () => {
  it('sem configuração lista todas na ordem padrão', async () => {
    const response = await getSources(app)
    expect(response.statusCode).toBe(200)
    expect(response.headers['cache-control']).toBe('no-cache')
    expect(response.json()).toEqual({ sources: ALL })
  })

  it('some das listas e das buscas por fonte; o acesso por id segue; reativar restaura', async () => {
    const hiddenPuzzle = await storePuzzle(db, '2026-10-13', 'cruzadaonline')

    const saved = await putSources(app, body({ cruzadaonline: false }), admin)
    expect(saved.statusCode).toBe(200)
    expect((await getSources(app)).json()).toEqual({
      sources: ALL.filter((id) => id !== 'cruzadaonline'),
    })

    const library = await app.inject({ method: 'GET', url: '/api/library?source=cruzadaonline' })
    expect(library.statusCode).toBe(400)
    expect(library.json()).toMatchObject({ error: 'invalid-input', fields: ['source'] })
    const byDate = await app.inject({
      method: 'GET',
      url: '/api/puzzles?source=cruzadaonline&date=2026-10-13',
    })
    expect(byDate.statusCode).toBe(400)
    expect(byDate.json()).toMatchObject({ error: 'invalid-input', fields: ['source'] })

    // Visitante, sem sessão e sem progresso prévio: o endereço direto continua abrindo.
    const byId = await app.inject({ method: 'GET', url: `/api/puzzles/${hiddenPuzzle}` })
    expect(byId.statusCode).toBe(200)

    await putSources(app, body(), admin)
    const back = await app.inject({ method: 'GET', url: '/api/library?source=cruzadaonline' })
    expect(back.statusCode).toBe(200)
    expect((await getSources(app)).json()).toEqual({ sources: ALL })
  })

  it('recusa esconder todas e nada muda', async () => {
    await putSources(app, body({ clube: false }), admin)
    const before = (await getSources(app, '/api/admin/sources', admin)).json()
    const refused = await putSources(
      app,
      body({ oglobo: false, cruzadaonline: false, cruzadasbrasil: false, clube: false }),
      admin,
    )
    expect(refused.statusCode).toBe(400)
    expect(refused.json()).toMatchObject({ error: 'no-visible-source' })
    expect((await getSources(app, '/api/admin/sources', admin)).json()).toEqual(before)
  })

  it('recusa lista incompleta ou repetida com invalid-input', async () => {
    const partial = await putSources(app, { sources: body().sources.slice(0, 3) }, admin)
    expect(partial.statusCode).toBe(400)
    expect(partial.json()).toMatchObject({ error: 'invalid-input', fields: ['sources'] })
  })

  it('dois salvamentos seguidos: vale o último e o registro tem duas linhas', async () => {
    await putSources(app, body({ clube: false }), admin)
    await putSources(app, body({ oglobo: false }), admin)
    expect((await getSources(app)).json()).toEqual({ sources: ALL.filter((id) => id !== 'oglobo') })
    expect(await changes()).toBe(2)
  })

  it('salvar sem mudança não cria linha de registro', async () => {
    await putSources(app, body({ clube: false }), admin)
    expect(await changes()).toBe(1)
    const again = await putSources(app, body({ clube: false }), admin)
    expect(again.statusCode).toBe(200)
    expect(await changes()).toBe(1)
    // O estado padrão salvo igual ao padrão também não grava.
    await truncateAll(db)
    admin = await signUpForTest(app, db, 'admin@exemplo.com', 'senha-boa-123', { isAdmin: true })
    await putSources(app, body(), admin)
    expect(await changes()).toBe(0)
  })
})
