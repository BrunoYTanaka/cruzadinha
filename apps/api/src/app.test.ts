import { healthStatusSchema } from '@cruzadinha/shared'
import { afterEach, describe, expect, it } from 'vitest'
import type { FastifyInstance } from 'fastify'
import { buildApp } from './app'
import { loadConfig } from './config'
import type { DatabaseProbe } from './db/probe'

const config = loadConfig({
  DATABASE_URL: 'postgres://user:SEGREDO@localhost:5432/db',
  LOG_LEVEL: 'fatal',
})

function probe(up: boolean): DatabaseProbe {
  return { check: async () => up, close: async () => {} }
}

let app: FastifyInstance | undefined

afterEach(async () => {
  await app?.close()
  app = undefined
})

describe('GET /api/health', () => {
  it.each([
    [true, 'up'],
    [false, 'down'],
  ] as const)('responds 200 with the database %s', async (up, database) => {
    app = buildApp({ config, probe: probe(up) })
    const response = await app.inject({ method: 'GET', url: '/api/health' })

    expect(response.statusCode).toBe(200)
    expect(healthStatusSchema.parse(response.json())).toEqual({ status: 'ok', database })
    expect(response.body).not.toContain('SEGREDO')
  })

  it('responds 404 on other routes', async () => {
    app = buildApp({ config, probe: probe(true) })
    const response = await app.inject({ method: 'GET', url: '/api/outra' })

    expect(response.statusCode).toBe(404)
  })
})
