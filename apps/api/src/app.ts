import cookie from '@fastify/cookie'
import Fastify, { type FastifyInstance } from 'fastify'
import type { ServerConfig } from './config'
import type { Database } from './platform/db/client'
import { describeError, isConnectionError } from './platform/db/errors'
import type { DatabaseProbe } from './platform/db/probe'
import { apiError } from './platform/http/errors'
import { proxyGuard } from './platform/http/proxy-guard'
import { systemClock, type Clock } from './platform/lib/clock'
import {
  identityRoutes,
  createAuthService,
  createRecoveryService,
  createRegistrationService,
  createOptionalSession,
  createRequireSession,
} from './modules/identity'
import { createEmailService, createLogSender, createResendSender } from './platform/email'
import type { EmailSender } from './platform/email'
import { healthRoutes } from './modules/health/health.routes'
import {
  defaultRateLimits,
  type RateLimits,
  createRateLimitRepository,
  createRateLimiter,
} from './platform/rate-limit'
import { libraryRoutes } from './modules/library/library.routes'
import { createLibraryService } from './modules/library/library.service'
import { progressRoutes } from './modules/progress/progress.routes'
import { createProgressService } from './modules/progress/progress.service'
import { puzzlesRoutes, createPuzzlesService } from './modules/puzzles'
import { settingsRoutes } from './modules/settings/settings.routes'
import { createSettingsService } from './modules/settings/settings.service'
import { createClubeSource } from './sources/clube/clube'
import { createCruzadaOnlineSource } from './sources/cruzadaonline/cruzadaonline'
import { createCruzadasBrasilSource } from './sources/cruzadasbrasil/cruzadasbrasil'
import { createOgloboSource } from './sources/oglobo/oglobo'
import type { PuzzleSource } from './sources/types'
import { API_VERSION } from './version'

declare module 'fastify' {
  interface FastifyInstance {
    /** Aguarda os e-mails em andamento; só os testes e o desligamento usam. */
    flushEmail(): Promise<void>
  }
}

export type AppDeps = {
  config: ServerConfig
  probe: DatabaseProbe
  database: Database
  clock?: Clock
  rateLimits?: RateLimits
  /** Um adaptador por fonte de puzzles; os testes passam fontes falsas. */
  puzzleSources?: readonly PuzzleSource[]
  /** Envio de e-mail; os testes passam um falso, e sem ele vale o Resend, o log ou nenhum. */
  emailSender?: EmailSender
  /** Destino do log; só os testes trocam (para conferir o que é registrado). */
  logStream?: NodeJS.WritableStream
}

export function buildApp({
  config,
  probe,
  database,
  clock = systemClock,
  rateLimits = defaultRateLimits,
  puzzleSources = [
    createOgloboSource(),
    createCruzadaOnlineSource(),
    createCruzadasBrasilSource(),
    createClubeSource(),
  ],
  emailSender,
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
    app.register(import('./platform/docs/docs.plugin'))
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
  const email = createEmailService({
    db: database,
    clock,
    sender: emailSender ?? defaultEmailSender(config, app.log),
    rateLimiter,
    config: config.email,
    logger: app.log,
  })
  const emailParts = {
    db: database,
    clock,
    email,
    rateLimiter,
    limits: rateLimits,
    baseUrl: config.email.baseUrl ?? '',
  }
  const registration = createRegistrationService(emailParts)
  const recovery = createRecoveryService(emailParts)
  // Os envios em andamento terminam antes de a API fechar.
  app.decorate('flushEmail', () => email.flush())
  app.addHook('onClose', () => email.flush())

  app.register(healthRoutes, {
    probe,
    release: { version: API_VERSION, commit: config.releaseCommit },
  })
  const requireSession = createRequireSession(auth, config, clock)
  const optionalSession = createOptionalSession(auth, config, clock)

  app.register(identityRoutes, {
    auth,
    config,
    clock,
    requireSession,
    email,
    registration,
    recovery,
  })
  const puzzles = createPuzzlesService({
    db: database,
    clock,
    sources: puzzleSources,
    rateLimiter,
    limits: rateLimits,
  })
  app.register(puzzlesRoutes, { puzzles, optionalSession })
  const progress = createProgressService({ db: database, clock })
  app.register(progressRoutes, { progress, requireSession })
  const library = createLibraryService({ db: database })
  app.register(libraryRoutes, { library, optionalSession })
  const settings = createSettingsService({
    db: database,
    clock,
    rateLimiter,
    limits: rateLimits,
  })
  app.register(settingsRoutes, { settings, requireSession })
  return app
}

// Resend com a chave configurada; sem ela, o log em desenvolvimento e nenhum envio em produção
// (as rotas respondem `email-unavailable`).
export function defaultEmailSender(
  config: ServerConfig,
  log: Parameters<typeof createLogSender>[0],
): EmailSender | undefined {
  const { apiKey, from } = config.email
  if (apiKey && from) return createResendSender({ apiKey, from })
  return config.nodeEnv === 'production' ? undefined : createLogSender(log)
}
