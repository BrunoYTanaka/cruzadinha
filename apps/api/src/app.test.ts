import { healthStatusSchema } from '@cruzadinha/shared'
import { afterAll, afterEach, describe, expect, it } from 'vitest'
import type { FastifyInstance } from 'fastify'
import { buildApp } from './app'
import { loadConfig } from './config'
import { createDatabase } from './db/client'
import type { DatabaseProbe } from './db/probe'

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
    expect(healthStatusSchema.parse(response.json())).toEqual({ status: 'ok', database })
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
