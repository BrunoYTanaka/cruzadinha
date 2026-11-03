import type { FastifyInstance } from 'fastify'
import { afterAll, afterEach, beforeEach, describe, expect, it } from 'vitest'
import { buildTestApp, signUpForTest } from './app'
import { openTestDatabase, testClock, truncateAll } from './database'
import { ALL, body, getSources, putSources } from './admin-sources.support'

const handle = openTestDatabase()
const { db } = handle

let app: FastifyInstance
let admin: string

beforeEach(async () => {
  await truncateAll(db)
  app = buildTestApp({ database: db, clock: testClock().now })
  admin = await signUpForTest(app, db, 'admin@exemplo.com', 'senha-boa-123', { isAdmin: true })
})
afterEach(() => app.close())
afterAll(() => handle.close())

describe('ordem das fontes', () => {
  it('reflete a nova ordem, inclusive trocar duas fontes de lugar', async () => {
    const swapped = ['cruzadaonline', 'oglobo', 'cruzadasbrasil', 'clube'] as typeof ALL
    expect((await putSources(app, body({}, swapped), admin)).statusCode).toBe(200)
    expect((await getSources(app)).json()).toEqual({ sources: swapped })
    const admins = (await getSources(app, '/api/admin/sources', admin)).json()
    expect(admins.sources.map((s: { id: string }) => s.id)).toEqual(swapped)
    expect(admins.sources.map((s: { position: number }) => s.position)).toEqual([0, 1, 2, 3])

    const reversed = [...ALL].reverse()
    expect((await putSources(app, body({}, reversed), admin)).statusCode).toBe(200)
    expect((await getSources(app)).json()).toEqual({ sources: reversed })
  })

  it('o admin vê as escondidas na ordem; o público não', async () => {
    await putSources(
      app,
      body({ oglobo: false }, ['clube', 'oglobo', 'cruzadaonline', 'cruzadasbrasil']),
      admin,
    )
    const admins = (await getSources(app, '/api/admin/sources', admin)).json()
    expect(admins.sources[1]).toEqual({ id: 'oglobo', visible: false, position: 1 })
    expect((await getSources(app)).json()).toEqual({
      sources: ['clube', 'cruzadaonline', 'cruzadasbrasil'],
    })
  })
})
