import { eq } from 'drizzle-orm'
import type { FastifyInstance } from 'fastify'
import { afterAll, afterEach, beforeEach, describe, expect, it } from 'vitest'
import { sessions } from '../db/schema'
import { sha256Hex } from '../lib/tokens'
import { createInvitesService } from '../modules/invites/invites.service'
import type { RateLimits } from '../modules/rate-limit/limits'
import { buildTestApp, sessionCookieFrom } from './app'
import { DAY, MINUTE, openTestDatabase, testClock, truncateAll, type TestClock } from './database'

const handle = openTestDatabase()
const { db } = handle

let clock: TestClock
let app: FastifyInstance

beforeEach(async () => {
  await truncateAll(db)
  clock = testClock()
  app = buildTestApp({ database: db, clock: clock.now })
})
afterEach(() => app.close())
afterAll(() => handle.close())

const PASSWORD = 'senha-boa-123'
const UNAUTHENTICATED = { error: 'unauthenticated', message: 'Não autenticado.' }
const INVALID_CREDENTIALS = { error: 'invalid-credentials', message: 'E-mail ou senha incorretos.' }

async function createAccount(email: string): Promise<string> {
  const invite = await createInvitesService({ db, clock: clock.now }).createInvite({ days: 7 })
  const response = await app.inject({
    method: 'POST',
    url: '/api/auth/register',
    payload: { email, password: PASSWORD, inviteCode: invite.code },
  })
  expect(response.statusCode).toBe(201)
  const cookie = sessionCookieFrom(response.headers['set-cookie'])
  if (!cookie) throw new Error('cadastro sem cookie')
  return cookie
}

function login(email: string, password: string, remoteAddress?: string) {
  return app.inject({
    method: 'POST',
    url: '/api/auth/login',
    payload: { email, password },
    remoteAddress,
  })
}

function me(cookie?: string) {
  return app.inject({
    method: 'GET',
    url: '/api/auth/me',
    headers: cookie === undefined ? {} : { cookie: `sid=${cookie}` },
  })
}

async function sessionRow(cookie: string) {
  const [row] = await db
    .select()
    .from(sessions)
    .where(eq(sessions.tokenHash, sha256Hex(cookie)))
  return row
}

describe('login and me', () => {
  it('logs in ignoring e-mail case and answers who is logged in', async () => {
    await createAccount('ana@exemplo.com')
    const response = await login(' ANA@Exemplo.com', PASSWORD)

    expect(response.statusCode).toBe(200)
    const cookie = sessionCookieFrom(response.headers['set-cookie'])
    const whoami = await me(cookie)
    expect(whoami.statusCode).toBe(200)
    expect(whoami.json()).toEqual({ user: { id: expect.any(String), email: 'ana@exemplo.com' } })
    expect(whoami.body).not.toContain('password')
    expect(whoami.body).not.toContain('argon2')
  })

  it('answers the same for an unknown e-mail and a wrong password', async () => {
    await createAccount('ana@exemplo.com')
    const unknown = await login('ninguem@exemplo.com', PASSWORD)
    const wrong = await login('ana@exemplo.com', 'senha-errada-1')

    expect(unknown.statusCode).toBe(401)
    expect(wrong.statusCode).toBe(401)
    expect(unknown.json()).toEqual(INVALID_CREDENTIALS)
    expect(wrong.body).toBe(unknown.body)
    expect(wrong.headers['set-cookie']).toBeUndefined()
  })

  it('rejects missing, invented, malformed, expired and ended sessions', async () => {
    const cookie = await createAccount('ana@exemplo.com')
    const other = await createAccount('bia@exemplo.com')
    await app.inject({
      method: 'POST',
      url: '/api/auth/logout',
      headers: { cookie: `sid=${other}` },
    })

    const invented = 'A'.repeat(43)
    for (const value of [undefined, invented, '%%%', other]) {
      const response = await me(value)
      expect(response.statusCode, String(value)).toBe(401)
      expect(response.json()).toEqual(UNAUTHENTICATED)
    }

    clock.advance(30 * DAY)
    expect((await me(cookie)).statusCode).toBe(401)
  })
})

describe('logout', () => {
  it('ends the session on the server and expires the cookie', async () => {
    const cookie = await createAccount('ana@exemplo.com')
    const response = await app.inject({
      method: 'POST',
      url: '/api/auth/logout',
      headers: { cookie: `sid=${cookie}` },
    })

    expect(response.statusCode).toBe(204)
    expect(String(response.headers['set-cookie'])).toMatch(/^sid=;.*Expires=Thu, 01 Jan 1970/)
    expect((await sessionRow(cookie))?.endedAt).toBeInstanceOf(Date)
    expect((await me(cookie)).json()).toEqual(UNAUTHENTICATED)
  })

  it('answers 204 without a session', async () => {
    const response = await app.inject({ method: 'POST', url: '/api/auth/logout' })
    expect(response.statusCode).toBe(204)
  })
})

describe('renewal', () => {
  it('extends the session at most once a day', async () => {
    const cookie = await createAccount('ana@exemplo.com')

    clock.advance(2 * DAY)
    const renewed = await me(cookie)
    expect(renewed.statusCode).toBe(200)
    expect(String(renewed.headers['set-cookie'])).toContain(`Max-Age=${30 * 24 * 60 * 60}`)
    const row = await sessionRow(cookie)
    expect(row?.expiresAt.getTime()).toBe(clock.now().getTime() + 30 * DAY)

    clock.advance(60 * MINUTE)
    const again = await me(cookie)
    expect(again.headers['set-cookie']).toBeUndefined()
    expect((await sessionRow(cookie))?.expiresAt.getTime()).toBe(row?.expiresAt.getTime())
  })

  it('refuses a session used continuously after its absolute limit', async () => {
    const cookie = await createAccount('ana@exemplo.com')
    const opened = await sessionRow(cookie)
    if (!opened) throw new Error('sessão não encontrada')

    for (let day = 20; day <= 380; day += 20) {
      clock.advance(20 * DAY)
      const response = await me(cookie)
      const beforeLimit = clock.now().getTime() < opened.absoluteExpiresAt.getTime()
      expect(response.statusCode, `dia ${day}`).toBe(beforeLimit ? 200 : 401)
    }
    expect((await me(cookie)).statusCode).toBe(401)
  })

  it('keeps earlier sessions valid when logging in again', async () => {
    const first = await createAccount('ana@exemplo.com')
    const second = sessionCookieFrom(
      (await login('ana@exemplo.com', PASSWORD)).headers['set-cookie'],
    )

    expect(second).not.toBe(first)
    expect((await me(first)).statusCode).toBe(200)
    expect((await me(second)).statusCode).toBe(200)
  })
})

describe('login limits', () => {
  const TOO_MANY = { error: 'too-many-attempts', message: 'Muitas tentativas, tente mais tarde.' }

  it('blocks an e-mail after 5 failures, even with the right password, until the window passes', async () => {
    await createAccount('ana@exemplo.com')
    for (let i = 0; i < 5; i++) {
      expect((await login('ana@exemplo.com', 'senha-errada-1')).statusCode).toBe(401)
    }

    const blocked = await login('ana@exemplo.com', PASSWORD)
    expect(blocked.statusCode).toBe(429)
    expect(blocked.json()).toEqual(TOO_MANY)
    expect(Number(blocked.headers['retry-after'])).toBeGreaterThan(0)

    clock.advance(16 * MINUTE)
    expect((await login('ana@exemplo.com', PASSWORD)).statusCode).toBe(200)
  })

  it('blocks a network address after 20 failures with different e-mails', async () => {
    for (let i = 0; i < 20; i++) {
      expect((await login(`x${i}@exemplo.com`, 'senha-errada-1', '10.0.0.9')).statusCode).toBe(401)
    }
    const blocked = await login('outra@exemplo.com', 'senha-errada-1', '10.0.0.9')
    expect(blocked.statusCode).toBe(429)
    expect(blocked.json()).toEqual(TOO_MANY)
    expect((await login('outra@exemplo.com', 'senha-errada-1', '10.0.0.10')).statusCode).toBe(401)
  })

  it('clears the e-mail failures after a successful login', async () => {
    await createAccount('ana@exemplo.com')
    for (let i = 0; i < 4; i++) await login('ana@exemplo.com', 'senha-errada-1')
    expect((await login('ana@exemplo.com', PASSWORD)).statusCode).toBe(200)
    for (let i = 0; i < 4; i++) {
      expect((await login('ana@exemplo.com', 'senha-errada-1')).statusCode).toBe(401)
    }
    expect((await login('ana@exemplo.com', PASSWORD)).statusCode).toBe(200)
  })
})

describe('timing and speed', () => {
  const generous: RateLimits = {
    loginEmail: { max: 1000, windowMinutes: 15 },
    loginAddress: { max: 1000, windowMinutes: 15 },
    register: { max: 1000, windowMinutes: 60 },
    inviteCreate: { max: 1000, windowMinutes: 60 },
    puzzleFetch: { max: 1000, windowMinutes: 60 },
  }

  function mean(values: number[]): number {
    return values.reduce((sum, value) => sum + value, 0) / values.length
  }

  it(
    'takes the same time for an unknown e-mail and a wrong password (SC-007)',
    { retry: 2 },
    async () => {
      await app.close()
      app = buildTestApp({ database: db, clock: clock.now, rateLimits: generous })
      await createAccount('ana@exemplo.com')

      const unknown: number[] = []
      const wrong: number[] = []
      const measure = async (run: () => Promise<unknown>, into: number[]) => {
        const start = performance.now()
        await run()
        into.push(performance.now() - start)
      }
      const unknownLogin = (i: number) => () => login(`ninguem${i}@exemplo.com`, 'senha-errada-1')
      const wrongLogin = (i: number) => () => login('ana@exemplo.com', `senha-errada-${i}`)
      // A ordem alterna a cada par: quem é medido primeiro tende a ser um pouco mais lento.
      for (let i = 0; i < 20; i++) {
        if (i % 2 === 0) {
          await measure(unknownLogin(i), unknown)
          await measure(wrongLogin(i), wrong)
        } else {
          await measure(wrongLogin(i), wrong)
          await measure(unknownLogin(i), unknown)
        }
      }

      // Média, não mediana: as amostras são bimodais (±2 ms sobre ~14 ms) e a mediana salta entre
      // os dois picos. Sem o hash fictício a diferença passa de 80%, então as repetições
      // (retry) só absorvem a oscilação da máquina, sem esconder um vazamento real.
      const a = mean(unknown.slice(2))
      const b = mean(wrong.slice(2))
      expect(Math.abs(a - b) / Math.max(a, b)).toBeLessThan(0.1)
    },
  )

  it('answers register, login, me and logout in under 1 second each (SC-008)', async () => {
    const invite = await createInvitesService({ db, clock: clock.now }).createInvite({ days: 7 })
    const timed = async <T>(run: () => Promise<T>): Promise<T> => {
      const start = performance.now()
      const result = await run()
      expect(performance.now() - start).toBeLessThan(1000)
      return result
    }

    await timed(() =>
      app.inject({
        method: 'POST',
        url: '/api/auth/register',
        payload: { email: 'ana@exemplo.com', password: PASSWORD, inviteCode: invite.code },
      }),
    )
    const cookie = sessionCookieFrom(
      (await timed(() => login('ana@exemplo.com', PASSWORD))).headers['set-cookie'],
    )
    await timed(() => me(cookie))
    await timed(() =>
      app.inject({ method: 'POST', url: '/api/auth/logout', headers: { cookie: `sid=${cookie}` } }),
    )
  })
})
