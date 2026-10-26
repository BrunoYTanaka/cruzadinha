import cookie from '@fastify/cookie'
import Fastify, { type FastifyInstance } from 'fastify'
import { afterEach, describe, expect, it } from 'vitest'
import { loadConfig } from '../../../config'
import type { AuthService, Authenticated } from './auth.service'
import { createOptionalSession, createRequireSession } from './session.plugin'

const now = new Date('2026-10-16T12:00:00.000Z')
const config = loadConfig({ DATABASE_URL: 'postgres://nao-usado@localhost:1/db', NODE_ENV: 'test' })
const VALID = 'V'.repeat(43)
const user = { id: '00000000-0000-4000-8000-000000000001', email: 'ana@exemplo.com' }

// Só `authenticate` importa aqui: o resto do serviço não é chamado pelos preHandlers.
function fakeAuth(result: (token: string | undefined) => Authenticated | null): AuthService {
  return {
    authenticate: async (token) => result(token),
  } as Pick<AuthService, 'authenticate'> as AuthService
}

let app: FastifyInstance | undefined
afterEach(async () => {
  await app?.close()
  app = undefined
})

async function build(kind: 'optional' | 'require', auth: AuthService) {
  app = Fastify()
  await app.register(cookie)
  app.decorateRequest('user', null)
  const preHandler =
    kind === 'optional'
      ? createOptionalSession(auth, config, () => now)
      : createRequireSession(auth, config, () => now)
  app.get('/', { preHandler }, async (request) => ({ user: request.user }))
  return app
}

function get(instance: FastifyInstance, cookieValue?: string) {
  return instance.inject({
    method: 'GET',
    url: '/',
    headers: cookieValue === undefined ? {} : { cookie: `sid=${cookieValue}` },
  })
}

const onlyValid = (token: string | undefined) => (token === VALID ? { user } : null)

describe('createOptionalSession', () => {
  it('lets a visitor through without a cookie', async () => {
    const response = await get(await build('optional', fakeAuth(onlyValid)))
    expect(response.statusCode).toBe(200)
    expect(response.json()).toEqual({ user: null })
    expect(response.headers['set-cookie']).toBeUndefined()
  })

  it('fills the user and renews the cookie with a valid session', async () => {
    const renewedExpiresAt = new Date('2026-11-15T12:00:00.000Z')
    const response = await get(
      await build(
        'optional',
        fakeAuth(() => ({ user, renewedExpiresAt })),
      ),
      VALID,
    )
    expect(response.statusCode).toBe(200)
    expect(response.json()).toEqual({ user })
    expect(String(response.headers['set-cookie'])).toContain(`sid=${VALID}`)
  })

  it('answers 401 and clears an invalid cookie', async () => {
    const response = await get(await build('optional', fakeAuth(onlyValid)), 'A'.repeat(43))
    expect(response.statusCode).toBe(401)
    expect(response.json()).toEqual({ error: 'unauthenticated', message: 'Não autenticado.' })
    expect(String(response.headers['set-cookie'])).toMatch(/^sid=;.*Expires=Thu, 01 Jan 1970/)
  })
})

describe('createRequireSession', () => {
  it('answers 401 without Set-Cookie when there is no cookie', async () => {
    const response = await get(await build('require', fakeAuth(onlyValid)))
    expect(response.statusCode).toBe(401)
    expect(response.headers['set-cookie']).toBeUndefined()
  })

  it('answers 401 and clears an invalid cookie', async () => {
    const response = await get(await build('require', fakeAuth(onlyValid)), '%%%')
    expect(response.statusCode).toBe(401)
    expect(String(response.headers['set-cookie'])).toMatch(/^sid=;.*Expires=Thu, 01 Jan 1970/)
  })

  it('fills the user with a valid session', async () => {
    const response = await get(await build('require', fakeAuth(onlyValid)), VALID)
    expect(response.json()).toEqual({ user })
  })
})
