import { and, eq } from 'drizzle-orm'
import type { FastifyInstance } from 'fastify'
import { afterAll, afterEach, beforeEach, describe, expect, it } from 'vitest'
import { rateLimitAttempts } from '../db/schema'
import { defaultRateLimits, type RateLimits } from '../modules/rate-limit/limits'
import { buildTestApp } from './app'
import { openTestDatabase, testClock, truncateAll } from './database'

const handle = openTestDatabase()
const { db } = handle

const PASSWORD = 'senha-boa-123'
const limits: RateLimits = { ...defaultRateLimits, loginEmail: { max: 5, windowMinutes: 15 } }

let app: FastifyInstance

beforeEach(async () => {
  await truncateAll(db)
  app = buildTestApp({ database: db, clock: testClock().now, rateLimits: limits })
})
afterEach(() => app.close())
afterAll(() => handle.close())

function login(email: string, password: string) {
  return app.inject({ method: 'POST', url: '/api/auth/login', payload: { email, password } })
}

async function createAccount(email: string) {
  const response = await app.inject({
    method: 'POST',
    url: '/api/auth/register',
    payload: { email, password: PASSWORD },
  })
  expect(response.statusCode).toBe(201)
}

function attempts(keyType: 'EMAIL' | 'NETWORK_ADDRESS') {
  return db
    .select()
    .from(rateLimitAttempts)
    .where(and(eq(rateLimitAttempts.action, 'LOGIN'), eq(rateLimitAttempts.keyType, keyType)))
}

async function statuses(email: string, count: number) {
  const responses = await Promise.all(
    Array.from({ length: count }, () => login(email, 'senha-errada-1')),
  )
  return responses.map((response) => response.statusCode)
}

describe('login limit under simultaneous requests', () => {
  it('lets at most the limit through to the password check', async () => {
    await createAccount('ana@exemplo.com')
    const codes = await statuses('ana@exemplo.com', 10)

    expect(codes.filter((code) => code === 401)).toHaveLength(5)
    expect(codes.filter((code) => code === 429)).toHaveLength(5)
  })

  it('treats an unknown e-mail like a known one', async () => {
    const codes = await statuses('ninguem@exemplo.com', 10)

    expect(codes.filter((code) => code === 401)).toHaveLength(5)
    expect(codes.filter((code) => code === 429)).toHaveLength(5)
  })

  it('refuses even the right password once the limit is reached', async () => {
    await createAccount('ana@exemplo.com')
    await statuses('ana@exemplo.com', 5)

    expect((await login('ana@exemplo.com', PASSWORD)).statusCode).toBe(429)
  })

  it('leaves one row per key for a single failure', async () => {
    await createAccount('ana@exemplo.com')
    await login('ana@exemplo.com', 'senha-errada-1')

    expect(await attempts('EMAIL')).toHaveLength(1)
    expect(await attempts('NETWORK_ADDRESS')).toHaveLength(1)
  })

  it('clears the e-mail failures and leaves no address row after a successful login', async () => {
    await createAccount('ana@exemplo.com')
    await statuses('ana@exemplo.com', 3)

    expect((await login('ana@exemplo.com', PASSWORD)).statusCode).toBe(200)
    expect(await attempts('EMAIL')).toHaveLength(0)
    // As 3 falhas continuam contando contra o endereço; o login certo não soma outra.
    expect(await attempts('NETWORK_ADDRESS')).toHaveLength(3)
  })

  it('does not keep the rows of a refused attempt', async () => {
    await createAccount('ana@exemplo.com')
    await statuses('ana@exemplo.com', 5)
    await login('ana@exemplo.com', 'senha-errada-1')

    expect(await attempts('EMAIL')).toHaveLength(5)
    expect(await attempts('NETWORK_ADDRESS')).toHaveLength(5)
  })
})
