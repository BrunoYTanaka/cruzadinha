import { randomBytes } from 'node:crypto'
import type { FastifyInstance } from 'fastify'
import { afterAll, afterEach, beforeEach, describe, expect, it } from 'vitest'
import { defaultRateLimits } from '../platform/rate-limit/limits'
import { buildTestApp } from './app'
import { openTestDatabase, testClock, truncateAll } from './database'

// Limites contados pelo endereço real que o repasse do site informa (feature 012, FR-006).
const handle = openTestDatabase()
const { db } = handle
const SECRET = randomBytes(24).toString('hex')

let app: FastifyInstance

beforeEach(async () => {
  await truncateAll(db)
  app = buildTestApp({
    database: db,
    clock: testClock().now,
    env: { PROXY_SECRET: SECRET, TRUST_PROXY_HOPS: '1' },
    rateLimits: { ...defaultRateLimits, loginAddress: { max: 2, windowMinutes: 15 } },
  })
})
afterEach(() => app.close())
afterAll(() => handle.close())

function login(email: string, headers: Record<string, string>) {
  return app.inject({
    method: 'POST',
    url: '/api/auth/login',
    payload: { email, password: 'senha-errada-1' },
    headers: { 'x-cruzadinha-proxy-secret': SECRET, ...headers },
  })
}

describe('limits behind the site proxy', () => {
  it('counts per client IP and ignores an invented X-Forwarded-For', async () => {
    const blocked = { 'x-cruzadinha-client-ip': '203.0.113.1' }
    expect((await login('a@x.com', blocked)).statusCode).toBe(401)
    expect((await login('b@x.com', blocked)).statusCode).toBe(401)
    expect((await login('c@x.com', blocked)).statusCode).toBe(429)

    const other = await login('d@x.com', { 'x-cruzadinha-client-ip': '203.0.113.2' })
    expect(other.statusCode).toBe(401)

    const spoofed = await login('e@x.com', { ...blocked, 'x-forwarded-for': '198.51.100.9' })
    expect(spoofed.statusCode).toBe(429)
  })

  it('counts an IPv6 client by its /64 block, and an IPv4-mapped one by its IPv4', async () => {
    const first = { 'x-cruzadinha-client-ip': '2001:db8:1:2:aaaa::1' }
    expect((await login('a@x.com', first)).statusCode).toBe(401)
    expect((await login('b@x.com', first)).statusCode).toBe(401)

    const sameBlock = { 'x-cruzadinha-client-ip': '2001:db8:1:2:bbbb::9' }
    expect((await login('c@x.com', sameBlock)).statusCode).toBe(429)

    const otherBlock = { 'x-cruzadinha-client-ip': '2001:db8:1:3::1' }
    expect((await login('d@x.com', otherBlock)).statusCode).toBe(401)

    const mappedA = { 'x-cruzadinha-client-ip': '::ffff:203.0.113.5' }
    const mappedB = { 'x-cruzadinha-client-ip': '::ffff:203.0.113.6' }
    expect((await login('e@x.com', mappedA)).statusCode).toBe(401)
    expect((await login('f@x.com', mappedB)).statusCode).toBe(401)
  })

  it('refuses a request that did not come through the site', async () => {
    const response = await app.inject({ method: 'GET', url: '/api/auth/me' })
    expect(response.statusCode).toBe(403)
    expect(response.json()).toMatchObject({ error: 'forbidden' })
  })
})
