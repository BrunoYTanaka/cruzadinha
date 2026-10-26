import type { FastifyReply } from 'fastify'
import type { ServerConfig } from '../../../config'
import { SESSION_COOKIE } from '../../../platform/http/session-cookie-name'

export { SESSION_COOKIE }

export function setSessionCookie(
  reply: FastifyReply,
  token: string,
  expiresAt: Date,
  now: Date,
  nodeEnv: ServerConfig['nodeEnv'],
): FastifyReply {
  return reply.setCookie(SESSION_COOKIE, token, {
    httpOnly: true,
    sameSite: 'lax',
    path: '/',
    // Fora do desenvolvimento local e dos testes, o cookie só trafega por HTTPS (FR-013).
    secure: nodeEnv === 'production',
    maxAge: Math.max(0, Math.round((expiresAt.getTime() - now.getTime()) / 1000)),
  })
}

export function clearSessionCookie(reply: FastifyReply): FastifyReply {
  return reply.clearCookie(SESSION_COOKIE, { path: '/' })
}
