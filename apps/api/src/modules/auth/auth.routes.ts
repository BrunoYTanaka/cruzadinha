import {
  loginRequestSchema,
  registerRequestSchema,
  type AuthResponse,
  type RegistrationStatus,
} from '@cruzadinha/shared'
import type { FastifyPluginAsync } from 'fastify'
import type { ServerConfig } from '../../config'
import { sendError, sendTooManyAttempts } from '../../http/errors'
import type { Clock } from '../../lib/clock'
import type { AuthService, AuthUser } from './auth.service'
import { clearSessionCookie, SESSION_COOKIE, setSessionCookie } from './session-cookie'
import type { RequireSession } from './session.plugin'
import {
  loginSchema,
  logoutSchema,
  meSchema,
  registerSchema,
  registrationSchema,
} from './auth.schemas'

export type AuthRoutesOptions = {
  auth: AuthService
  config: ServerConfig
  clock: Clock
  requireSession: RequireSession
}

function invalidFields(issues: { path: PropertyKey[] }[]): string[] {
  return [...new Set(issues.map((issue) => String(issue.path[0] ?? 'body')))]
}

function authResponse(user: AuthUser): AuthResponse {
  return { user: { id: user.id, email: user.email } }
}

export const authRoutes: FastifyPluginAsync<AuthRoutesOptions> = async (
  app,
  { auth, config, clock, requireSession },
) => {
  // Com a chave desligada, a recusa vem antes de tudo: não conta tentativa nem lê o corpo, e não
  // revela nada sobre contas (feature 013, FR-016).
  app.post('/api/auth/register', { schema: registerSchema }, async (request, reply) => {
    if (!config.registrationEnabled) return sendError(reply, 403, 'registration-closed')

    const admission = await auth.admitRegistration(request.clientAddress)
    if (!admission.ok) return sendTooManyAttempts(reply, admission.retryAfterSeconds)

    const body: unknown = request.body
    const parsed = registerRequestSchema.safeParse(body)
    if (!parsed.success) {
      return sendError(reply, 400, 'invalid-input', invalidFields(parsed.error.issues))
    }

    const result = await auth.register({ email: parsed.data.email, password: parsed.data.password })
    if (!result.ok) return sendError(reply, 409, 'registration-failed')
    setSessionCookie(reply, result.sessionToken, result.expiresAt, clock(), config.nodeEnv)
    return reply.status(201).send(authResponse(result.user))
  })

  // Se o cadastro está aberto, para o site mostrar ou esconder "Criar conta" (FR-017).
  app.get('/api/auth/registration', { schema: registrationSchema }, async (_request, reply) => {
    const body: RegistrationStatus = { open: config.registrationEnabled }
    return reply.header('cache-control', 'no-store').send(body)
  })

  app.post('/api/auth/login', { schema: loginSchema }, async (request, reply) => {
    const body: unknown = request.body
    const parsed = loginRequestSchema.safeParse(body)
    if (!parsed.success) {
      return sendError(reply, 400, 'invalid-input', invalidFields(parsed.error.issues))
    }

    const result = await auth.login({ ...parsed.data, address: request.clientAddress })
    if (!result.ok) {
      return result.reason === 'too-many-attempts'
        ? sendTooManyAttempts(reply, result.retryAfterSeconds)
        : sendError(reply, 401, 'invalid-credentials')
    }
    setSessionCookie(reply, result.sessionToken, result.expiresAt, clock(), config.nodeEnv)
    return reply.status(200).send(authResponse(result.user))
  })

  // Idempotente: sem sessão válida também responde 204 e apaga o cookie.
  app.post('/api/auth/logout', { schema: logoutSchema }, async (request, reply) => {
    await auth.logout(request.cookies[SESSION_COOKIE])
    clearSessionCookie(reply)
    return reply.status(204).send()
  })

  app.get(
    '/api/auth/me',
    { schema: meSchema, preHandler: requireSession },
    async (request, reply) => {
      if (!request.user) return sendError(reply, 401, 'unauthenticated')
      return authResponse(request.user)
    },
  )
}
