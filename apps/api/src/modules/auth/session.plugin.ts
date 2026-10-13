import type { FastifyReply, FastifyRequest } from 'fastify'
import type { ServerConfig } from '../../config'
import { sendError } from '../../http/errors'
import type { Clock } from '../../lib/clock'
import type { AuthService, AuthUser } from './auth.service'
import { SESSION_COOKIE, setSessionCookie } from './session-cookie'

declare module 'fastify' {
  interface FastifyRequest {
    user: AuthUser | null
  }
}

export type RequireSession = (request: FastifyRequest, reply: FastifyReply) => Promise<void>

// preHandler das rotas autenticadas: recusa sem sessão válida e reenvia o cookie quando renova.
export function createRequireSession(
  auth: AuthService,
  config: ServerConfig,
  clock: Clock,
): RequireSession {
  return async (request, reply) => {
    const token = request.cookies[SESSION_COOKIE]
    const authenticated = await auth.authenticate(token)
    if (!authenticated) {
      await sendError(reply, 401, 'unauthenticated')
      return
    }
    request.user = authenticated.user
    if (token && authenticated.renewedExpiresAt) {
      setSessionCookie(reply, token, authenticated.renewedExpiresAt, clock(), config.nodeEnv)
    }
  }
}
