import { healthStatusSchema } from '@cruzadinha/shared'
import { afterAll, afterEach, describe, expect, it } from 'vitest'
import type { FastifyInstance } from 'fastify'
import { buildApp } from './app'
import { loadConfig } from './config'
import { createDatabase } from './platform/db/client'
import type { DatabaseProbe } from './platform/db/probe'
import { API_VERSION } from './version'

const config = loadConfig({
  DATABASE_URL: 'postgres://user:SEGREDO@localhost:5432/db',
  LOG_LEVEL: 'fatal',
})

function probe(up: boolean): DatabaseProbe {
  return { check: async () => up, close: async () => {} }
}

// Nunca consultado: o cliente do postgres.js só conecta na primeira consulta.
const testDatabase = createDatabase('postgres://user:SEGREDO@localhost:1/db')

let app: FastifyInstance | undefined

afterEach(async () => {
  await app?.close()
  app = undefined
})

afterAll(async () => {
  await testDatabase.close()
})

describe('GET /api/health', () => {
  it.each([
    [true, 'up'],
    [false, 'down'],
  ] as const)('responds 200 with the database %s', async (up, database) => {
    app = buildApp({ config, probe: probe(up), database: testDatabase.db })
    const response = await app.inject({ method: 'GET', url: '/api/health' })

    expect(response.statusCode).toBe(200)
    expect(healthStatusSchema.parse(response.json())).toEqual({
      status: 'ok',
      database,
      version: API_VERSION,
    })
    expect(response.body).not.toContain('SEGREDO')
  })

  it('responds 404 on other routes', async () => {
    app = buildApp({ config, probe: probe(true), database: testDatabase.db })
    const response = await app.inject({ method: 'GET', url: '/api/outra' })

    expect(response.statusCode).toBe(404)
  })
})

describe('error handler', () => {
  function appThrowing(error: unknown): FastifyInstance {
    const instance = buildApp({ config, probe: probe(true), database: testDatabase.db })
    instance.get('/api/boom', async () => {
      throw error
    })
    return instance
  }

  it('answers 503 with a generic body when the database is unreachable', async () => {
    const cause = Object.assign(new Error('connect ECONNREFUSED SEGREDO'), {
      code: 'ECONNREFUSED',
    })
    app = appThrowing(new Error('Failed query: params: SEGREDO', { cause }))
    const response = await app.inject({ method: 'GET', url: '/api/boom' })

    expect(response.statusCode).toBe(503)
    expect(response.json()).toEqual({
      error: 'service-unavailable',
      message: 'Serviço indisponível, tente mais tarde.',
    })
    expect(response.body).not.toContain('SEGREDO')
  })

  it('answers 500 with a generic body on other failures', async () => {
    app = appThrowing(new Error('SEGREDO'))
    const response = await app.inject({ method: 'GET', url: '/api/boom' })

    expect(response.statusCode).toBe(500)
    expect(response.json()).toEqual({ error: 'internal-error', message: 'Erro interno.' })
  })

  it('answers 400 invalid-input to a malformed JSON body', async () => {
    app = buildApp({ config, probe: probe(true), database: testDatabase.db })
    app.post('/api/echo', async () => ({ ok: true }))
    const response = await app.inject({
      method: 'POST',
      url: '/api/echo',
      headers: { 'content-type': 'application/json' },
      payload: '{"email":',
    })

    expect(response.statusCode).toBe(400)
    expect(response.json()).toEqual({ error: 'invalid-input', message: 'Dados inválidos.' })
  })
})

describe('fim dos convites (feature 013)', () => {
  it.each(['POST', 'GET'] as const)('%s /api/invites responde 404', async (method) => {
    app = buildApp({ config, probe: probe(true), database: testDatabase.db })
    const response = await app.inject({ method, url: '/api/invites' })
    expect(response.statusCode).toBe(404)
  })
})

describe('GET /api/auth/registration', () => {
  it.each([
    [undefined, false],
    ['true', true],
  ] as const)('com REGISTRATION_ENABLED=%s responde open=%s sem cache', async (value, open) => {
    const withFlag = loadConfig({
      DATABASE_URL: 'postgres://user:SEGREDO@localhost:5432/db',
      LOG_LEVEL: 'fatal',
      REGISTRATION_ENABLED: value,
    })
    app = buildApp({ config: withFlag, probe: probe(true), database: testDatabase.db })
    const response = await app.inject({ method: 'GET', url: '/api/auth/registration' })
    expect(response.statusCode).toBe(200)
    expect(response.json()).toEqual({ open, captchaRequired: false })
    expect(response.headers['cache-control']).toBe('no-store')
  })

  it('com o cadastro fechado, POST /api/auth/register responde 403 sem tocar no banco', async () => {
    app = buildApp({ config, probe: probe(true), database: testDatabase.db })
    const response = await app.inject({
      method: 'POST',
      url: '/api/auth/register',
      payload: { email: 'ana@exemplo.com', password: 'senha-boa-123' },
    })
    expect(response.statusCode).toBe(403)
    expect(response.json()).toEqual({
      error: 'registration-closed',
      message: 'O cadastro está fechado no momento.',
    })
  })
})
