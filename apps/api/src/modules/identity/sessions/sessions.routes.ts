import { loginRequestSchema, type AuthResponse } from '@cruzadinha/shared'
import type { FastifyPluginAsync } from 'fastify'
import type { ServerConfig } from '../../../config'
import { sendError, sendTooManyAttempts } from '../../../platform/http/errors'
import type { Clock } from '../../../platform/lib/clock'
import { invalidFields } from '../route-helpers'
import type { AuthService, AuthUser } from './auth.service'
import { clearSessionCookie, SESSION_COOKIE, setSessionCookie } from './session-cookie'
import type { RequireSession } from './session.plugin'
import { loginSchema, logoutSchema, meSchema } from './sessions.schemas'

function authResponse(user: AuthUser): AuthResponse {
  return { user: { id: user.id, email: user.email } }
}

export type SessionsRoutesOptions = {
  auth: AuthService
  config: ServerConfig
  clock: Clock
  requireSession: RequireSession
}

export const sessionsRoutes: FastifyPluginAsync<SessionsRoutesOptions> = async (
  app,
  { auth, config, clock, requireSession },
) => {
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
