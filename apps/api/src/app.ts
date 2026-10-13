import cookie from '@fastify/cookie'
import Fastify, { type FastifyInstance } from 'fastify'
import type { ServerConfig } from './config'
import type { Database } from './db/client'
import { describeError, isConnectionError } from './db/errors'
import type { DatabaseProbe } from './db/probe'
import { apiError } from './http/errors'
import { systemClock, type Clock } from './lib/clock'
import { authRoutes } from './modules/auth/auth.routes'
import { createAuthService } from './modules/auth/auth.service'
import { createRequireSession } from './modules/auth/session.plugin'
import { healthRoutes } from './modules/health/health.routes'
import { invitesRoutes } from './modules/invites/invites.routes'
import { createInvitesService } from './modules/invites/invites.service'
import { defaultRateLimits, type RateLimits } from './modules/rate-limit/limits'
import { createRateLimitRepository } from './modules/rate-limit/rate-limit.repository'
import { createRateLimiter } from './modules/rate-limit/rate-limit.service'

export type AppDeps = {
  config: ServerConfig
  probe: DatabaseProbe
  database: Database
  clock?: Clock
  rateLimits?: RateLimits
}

export function buildApp({
  config,
  probe,
  database,
  clock = systemClock,
  rateLimits = defaultRateLimits,
}: AppDeps): FastifyInstance {
  const app = Fastify({
    logger: { level: config.logLevel },
    // Confia só nos N saltos de proxy configurados; com 0, o X-Forwarded-For é ignorado.
    trustProxy: (_address: string, hop: number) => hop < config.trustProxyHops,
  })

  // Os `schema` das rotas só documentam: a validação continua nos `safeParse` das rotas e as
  // respostas saem como estão, sem o Ajv nem o fast-json-stringify mudarem ordem, status ou corpo.
  app.setValidatorCompiler(() => (data) => ({ value: data }))
  app.setSerializerCompiler(() => (data) => JSON.stringify(data))

  app.register(cookie)
  app.decorateRequest('user', null)

  // Documentação só fora de produção, sem configuração que a ligue; registrada antes das
  // rotas para que todas entrem no documento.
  if (config.nodeEnv !== 'production') {
    app.register(import('./docs/docs.plugin'))
  }

  app.setErrorHandler((error, request, reply) => {
    const statusCode =
      typeof error === 'object' && error !== null && 'statusCode' in error
        ? Number(error.statusCode)
        : 500
    // Erros do próprio Fastify com o pedido (JSON mal formado, tipo de conteúdo errado).
    if (statusCode >= 400 && statusCode < 500) {
      return reply.status(400).send(apiError('invalid-input'))
    }
    // Só nome e código: a mensagem do Drizzle traz os parâmetros da consulta.
    request.log.error({ err: describeError(error) }, 'falha ao atender o pedido')
    if (isConnectionError(error)) {
      return reply.status(503).send(apiError('service-unavailable'))
    }
    return reply.status(500).send(apiError('internal-error'))
  })

  const rateLimiter = createRateLimiter(createRateLimitRepository(database))
  const auth = createAuthService({ db: database, clock, rateLimiter, limits: rateLimits })

  app.register(healthRoutes, { probe })
  const requireSession = createRequireSession(auth, config, clock)
  const invites = createInvitesService({ db: database, clock, rateLimiter, limits: rateLimits })

  app.register(authRoutes, { auth, config, clock, requireSession })
  app.register(invitesRoutes, { invites, requireSession })
  return app
}
