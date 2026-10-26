import { authResponseSchema, registrationStatusSchema } from '@cruzadinha/shared'
import type { FastifyInstance } from 'fastify'
import { afterAll, afterEach, beforeEach, describe, expect, it } from 'vitest'
import { buildTestApp, sessionCookieFrom, signUpForTest } from './app'
import { openTestDatabase, testClock, truncateAll } from './database'

const handle = openTestDatabase()
const { db } = handle

const PASSWORD = 'senha-boa-123'

let app: FastifyInstance

// Produção antes do lançamento B: cadastro fechado, site anterior (feature 035, FR-025).
beforeEach(async () => {
  await truncateAll(db)
  app = buildTestApp({
    database: db,
    clock: testClock().now,
    env: { REGISTRATION_ENABLED: 'false' },
  })
})
afterEach(() => app.close())
afterAll(() => handle.close())

describe('contrato que o site anterior usa, com o cadastro fechado', () => {
  it('registration, login, me e logout respondem como antes', async () => {
    const registration = await app.inject({ method: 'GET', url: '/api/auth/registration' })
    expect(registrationStatusSchema.parse(registration.json())).toEqual({ open: false })

    await signUpForTest(app, db, 'ana@exemplo.com', PASSWORD)
    const login = await app.inject({
      method: 'POST',
      url: '/api/auth/login',
      payload: { email: 'ana@exemplo.com', password: PASSWORD },
    })
    expect(login.statusCode).toBe(200)
    expect(authResponseSchema.parse(login.json()).user.email).toBe('ana@exemplo.com')
    const sid = sessionCookieFrom(login.headers['set-cookie'])

    const me = await app.inject({
      method: 'GET',
      url: '/api/auth/me',
      headers: { cookie: `sid=${sid}` },
    })
    expect(authResponseSchema.parse(me.json()).user.email).toBe('ana@exemplo.com')

    const logout = await app.inject({
      method: 'POST',
      url: '/api/auth/logout',
      headers: { cookie: `sid=${sid}` },
    })
    expect(logout.statusCode).toBe(204)
  })

  it('o cadastro segue recusado com 403 registration-closed', async () => {
    const response = await app.inject({
      method: 'POST',
      url: '/api/auth/register',
      payload: { email: 'ana@exemplo.com', password: PASSWORD, inviteCode: 'ABCD' },
    })
    expect(response.statusCode).toBe(403)
    expect(response.json().error).toBe('registration-closed')
  })
})
