import type { FastifyInstance } from 'fastify'
import { buildApp } from '../app'
import { loadConfig } from '../config'
import type { Database } from '../db/client'
import type { Clock } from '../lib/clock'
import type { RateLimits } from '../modules/rate-limit/limits'
import type { PuzzleSource } from '../sources/types'

export function buildTestApp(options: {
  database: Database
  clock: Clock
  rateLimits?: RateLimits
  puzzleSource?: PuzzleSource
}): FastifyInstance {
  const config = loadConfig({
    DATABASE_URL: 'postgres://nao-usado@localhost:1/db',
    NODE_ENV: 'test',
    LOG_LEVEL: 'fatal',
  })
  return buildApp({
    config,
    probe: { check: async () => true, close: async () => {} },
    ...options,
  })
}

export function sessionCookieFrom(setCookie: string | string[] | undefined): string | undefined {
  const headers = Array.isArray(setCookie) ? setCookie : setCookie ? [setCookie] : []
  for (const header of headers) {
    const match = /^sid=([^;]*)/.exec(header)
    if (match?.[1]) return match[1]
  }
  return undefined
}
