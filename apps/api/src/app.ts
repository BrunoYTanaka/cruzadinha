import Fastify, { type FastifyInstance } from 'fastify'
import type { ServerConfig } from './config'
import type { DatabaseProbe } from './db/probe'
import { healthRoutes } from './modules/health/health.routes'

export type AppDeps = {
  config: ServerConfig
  probe: DatabaseProbe
}

export function buildApp({ config, probe }: AppDeps): FastifyInstance {
  const app = Fastify({ logger: { level: config.logLevel } })
  app.register(healthRoutes, { probe })
  return app
}
