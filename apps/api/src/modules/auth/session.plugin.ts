import type { FastifyReply, FastifyRequest } from 'fastify'
import type { ServerConfig } from '../../config'
import { sendError } from '../../http/errors'
import type { Clock } from '../../lib/clock'
import type { AuthService, AuthUser } from './auth.service'
import { clearSessionCookie, SESSION_COOKIE, setSessionCookie } from './session-cookie'

declare module 'fastify' {
  interface FastifyRequest {
    user: AuthUser | null
  }
}

export type RequireSession = (request: FastifyRequest, reply: FastifyReply) => Promise<void>
export type OptionalSession = RequireSession

type Outcome = 'visitor' | 'user' | 'invalid'

// Lê o cookie e preenche `request.user`. Um cookie presente e inválido (expirado, encerrado, mal
// formado) é apagado, para os pedidos seguintes já saírem como visitante (feature 013, R8).
async function resolveSession(
  auth: AuthService,
  config: ServerConfig,
  clock: Clock,
  request: FastifyRequest,
  reply: FastifyReply,
): Promise<Outcome> {
  const token = request.cookies[SESSION_COOKIE]
  if (token === undefined) return 'visitor'
  const authenticated = await auth.authenticate(token)
  if (!authenticated) {
    clearSessionCookie(reply)
    return 'invalid'
  }
  request.user = authenticated.user
  if (authenticated.renewedExpiresAt) {
    setSessionCookie(reply, token, authenticated.renewedExpiresAt, clock(), config.nodeEnv)
  }
  return 'user'
}

// preHandler das rotas autenticadas: recusa sem sessão válida e reenvia o cookie quando renova.
export function createRequireSession(
  auth: AuthService,
  config: ServerConfig,
  clock: Clock,
): RequireSession {
  return async (request, reply) => {
    const outcome = await resolveSession(auth, config, clock, request, reply)
    if (outcome !== 'user') await sendError(reply, 401, 'unauthenticated')
  }
}

// preHandler das rotas abertas a visitantes (puzzles e biblioteca): sem cookie, segue com
// `request.user = null`; com cookie inválido, responde 401 para o site saber que a sessão acabou.
export function createOptionalSession(
  auth: AuthService,
  config: ServerConfig,
  clock: Clock,
): OptionalSession {
  return async (request, reply) => {
    const outcome = await resolveSession(auth, config, clock, request, reply)
    if (outcome === 'invalid') await sendError(reply, 401, 'unauthenticated')
  }
}
