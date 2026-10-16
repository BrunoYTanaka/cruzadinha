import cookie from '@fastify/cookie'
import Fastify, { type FastifyInstance } from 'fastify'
import type { ServerConfig } from './config'
import type { Database } from './db/client'
import { describeError, isConnectionError } from './db/errors'
import type { DatabaseProbe } from './db/probe'
import { apiError } from './http/errors'
import { proxyGuard } from './http/proxy-guard'
import { systemClock, type Clock } from './lib/clock'
import { authRoutes } from './modules/auth/auth.routes'
import { createAuthService } from './modules/auth/auth.service'
import { createOptionalSession, createRequireSession } from './modules/auth/session.plugin'
import { healthRoutes } from './modules/health/health.routes'
import { defaultRateLimits, type RateLimits } from './modules/rate-limit/limits'
import { createRateLimitRepository } from './modules/rate-limit/rate-limit.repository'
import { createRateLimiter } from './modules/rate-limit/rate-limit.service'
import { libraryRoutes } from './modules/library/library.routes'
import { createLibraryService } from './modules/library/library.service'
import { progressRoutes } from './modules/progress/progress.routes'
import { createProgressService } from './modules/progress/progress.service'
import { puzzlesRoutes } from './modules/puzzles/puzzles.routes'
import { createPuzzlesService } from './modules/puzzles/puzzles.service'
import { createOgloboSource } from './sources/oglobo/oglobo'
import type { PuzzleSource } from './sources/types'
import { API_VERSION } from './version'

export type AppDeps = {
  config: ServerConfig
  probe: DatabaseProbe
  database: Database
  clock?: Clock
  rateLimits?: RateLimits
  puzzleSource?: PuzzleSource
  /** Destino do log; só os testes trocam (para conferir o que é registrado). */
  logStream?: NodeJS.WritableStream
}

export function buildApp({
  config,
  probe,
  database,
  clock = systemClock,
  rateLimits = defaultRateLimits,
  puzzleSource = createOgloboSource(),
  logStream,
}: AppDeps): FastifyInstance {
  const app = Fastify({
    logger: logStream ? { level: config.logLevel, stream: logStream } : { level: config.logLevel },
    // Confia só nos N saltos de proxy configurados; com 0, o X-Forwarded-For é ignorado. Com
    // PROXY_SECRET (produção), o endereço usado nos limites vem do repasse do site (proxy-guard).
    trustProxy: (_address: string, hop: number) => hop < config.trustProxyHops,
  })

  // Os `schema` das rotas só documentam: a validação continua nos `safeParse` das rotas e as
  // respostas saem como estão, sem o Ajv nem o fast-json-stringify mudarem ordem, status ou corpo.
  app.setValidatorCompiler(() => (data) => ({ value: data }))
  app.setSerializerCompiler(() => (data) => JSON.stringify(data))

  app.register(cookie)
  app.register(proxyGuard, { proxySecret: config.proxySecret })
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

  app.register(healthRoutes, {
    probe,
    release: { version: API_VERSION, commit: config.releaseCommit },
  })
  const requireSession = createRequireSession(auth, config, clock)
  const optionalSession = createOptionalSession(auth, config, clock)

  app.register(authRoutes, { auth, config, clock, requireSession })
  const puzzles = createPuzzlesService({
    db: database,
    clock,
    source: puzzleSource,
    rateLimiter,
    limits: rateLimits,
  })
  app.register(puzzlesRoutes, { puzzles, optionalSession })
  const progress = createProgressService({ db: database, clock })
  app.register(progressRoutes, { progress, requireSession })
  const library = createLibraryService({ db: database })
  app.register(libraryRoutes, { library, optionalSession })
  return app
}
