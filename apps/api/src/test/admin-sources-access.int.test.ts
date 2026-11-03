import type { FastifyInstance } from 'fastify'
import { eq, sql } from 'drizzle-orm'
import { afterAll, afterEach, beforeEach, describe, expect, it } from 'vitest'
import { users } from '../platform/db/schema'
import { buildTestApp, signUpForTest } from './app'
import { openTestDatabase, testClock, truncateAll } from './database'
import { body, getSources } from './admin-sources.support'

const handle = openTestDatabase()
const { db } = handle

let app: FastifyInstance
let plain: string
let admin: string

async function missing() {
  const response = await app.inject({ method: 'GET', url: '/api/rota-inexistente' })
  return { statusCode: response.statusCode, json: response.json() }
}

async function settingsCount(): Promise<number> {
  const rows = await db.execute<{ total: number }>(
    sql`SELECT (SELECT count(*) FROM source_settings) + (SELECT count(*) FROM source_setting_changes) AS total`,
  )
  return Number(rows[0]?.total ?? -1)
}

beforeEach(async () => {
  await truncateAll(db)
  app = buildTestApp({ database: db, clock: testClock().now })
  plain = await signUpForTest(app, db, 'ana@exemplo.com', 'senha-boa-123')
  admin = await signUpForTest(app, db, 'admin@exemplo.com', 'senha-boa-123', { isAdmin: true })
})
afterEach(() => app.close())
afterAll(() => handle.close())

function request(method: 'GET' | 'PUT', headers: Record<string, string>, payload?: string) {
  return app.inject({ method, url: '/api/admin/sources', headers, payload })
}

describe('só admin acessa a administração', () => {
  const callers = () =>
    [
      ['visitante', {}],
      ['cookie inválido', { cookie: `sid=${'A'.repeat(43)}` }],
      ['conta comum', { cookie: `sid=${plain}` }],
    ] as const

  it.each(['visitante', 'cookie inválido', 'conta comum'])(
    'GET e PUT de %s dão o mesmo 404 de uma rota inexistente, sem mudar nada',
    async (name) => {
      const headers = callers().find(([who]) => who === name)?.[1] ?? {}
      const expected = await missing()
      expect(expected.statusCode).toBe(404)

      const get = await request('GET', headers)
      expect(get.statusCode).toBe(404)
      expect(get.json().error).toBe(expected.json.error)

      const put = await request(
        'PUT',
        { ...headers, 'content-type': 'application/json' },
        JSON.stringify(body({ clube: false })),
      )
      expect(put.statusCode).toBe(404)

      // Corpo inválido e tipo errado: o 404 vem antes da leitura do corpo.
      const broken = await request('PUT', { ...headers, 'content-type': 'application/json' }, '{')
      expect(broken.statusCode).toBe(404)
      const wrongType = await request('PUT', { ...headers, 'content-type': 'text/plain' }, 'x')
      expect(wrongType.statusCode).toBe(404)
      expect(await settingsCount()).toBe(0)
    },
  )

  it('conta que deixa de ser admin recebe 404 no pedido seguinte com a mesma sessão', async () => {
    expect((await getSources(app, '/api/admin/sources', admin)).statusCode).toBe(200)
    await db.update(users).set({ isAdmin: false }).where(eq(users.email, 'admin@exemplo.com'))
    expect((await getSources(app, '/api/admin/sources', admin)).statusCode).toBe(404)
  })

  it('/api/auth/me traz isAdmin só como o papel da própria conta', async () => {
    const meOf = async (sid: string) =>
      (
        await app.inject({ method: 'GET', url: '/api/auth/me', headers: { cookie: `sid=${sid}` } })
      ).json()
    expect((await meOf(admin)).user.isAdmin).toBe(true)
    expect((await meOf(plain)).user.isAdmin).toBe(false)
  })

  it('nenhuma resposta pública traz o registro de alterações', async () => {
    const saved = await app.inject({
      method: 'PUT',
      url: '/api/admin/sources',
      headers: { cookie: `sid=${admin}` },
      payload: body({ clube: false }),
    })
    expect(saved.statusCode).toBe(200)
    for (const url of ['/api/sources', '/api/admin/sources']) {
      const text = JSON.stringify((await getSources(app, url, admin)).json())
      expect(text).not.toMatch(/before|after|source_setting/)
    }
  })
})
