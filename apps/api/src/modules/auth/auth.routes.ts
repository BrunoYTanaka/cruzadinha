import {
  forgotPasswordRequestSchema,
  loginRequestSchema,
  registerRequestSchema,
  resendVerificationRequestSchema,
  resetPasswordRequestSchema,
  verifyEmailRequestSchema,
  type AuthResponse,
  type EmailRequestAccepted,
  type RegistrationStatus,
} from '@cruzadinha/shared'
import type { FastifyPluginAsync } from 'fastify'
import type { ServerConfig } from '../../config'
import { sendEmailUnavailable, sendError, sendTooManyAttempts } from '../../http/errors'
import type { Clock } from '../../lib/clock'
import type { EmailService } from '../email/email.service'
import type { AuthService, AuthUser } from './auth.service'
import type { RecoveryService } from './recovery.service'
import type { RegistrationService } from './registration.service'
import { clearSessionCookie, SESSION_COOKIE, setSessionCookie } from './session-cookie'
import type { RequireSession } from './session.plugin'
import {
  forgotPasswordSchema,
  loginSchema,
  logoutSchema,
  meSchema,
  registerSchema,
  registrationSchema,
  resendVerificationSchema,
  resetPasswordSchema,
  verifyEmailSchema,
} from './auth.schemas'

export type AuthRoutesOptions = {
  auth: AuthService
  config: ServerConfig
  clock: Clock
  requireSession: RequireSession
  email: EmailService
  registration: RegistrationService
  recovery: RecoveryService
}

const TOO_MANY_WITH_BODY = { withRetryAfterBody: true }

function invalidFields(issues: { path: PropertyKey[] }[]): string[] {
  return [...new Set(issues.map((issue) => String(issue.path[0] ?? 'body')))]
}

function authResponse(user: AuthUser): AuthResponse {
  return { user: { id: user.id, email: user.email } }
}

export const authRoutes: FastifyPluginAsync<AuthRoutesOptions> = async (
  app,
  { auth, config, clock, requireSession, email, registration, recovery },
) => {
  // Com a chave desligada, a recusa vem antes de tudo: não conta tentativa nem lê o corpo, e não
  // revela nada sobre contas (feature 013, FR-016). Aberto, o cadastro só grava uma pendência e
  // manda o link; a conta nasce em verify-email (feature 035).
  app.post('/api/auth/register', { schema: registerSchema }, async (request, reply) => {
    if (!config.registrationEnabled) return sendError(reply, 403, 'registration-closed')

    const admission = await auth.admitRegistration(request.clientAddress)
    if (!admission.ok)
      return sendTooManyAttempts(reply, admission.retryAfterSeconds, TOO_MANY_WITH_BODY)

    const body: unknown = request.body
    const parsed = registerRequestSchema.safeParse(body)
    if (!parsed.success) {
      return sendError(reply, 400, 'invalid-input', invalidFields(parsed.error.issues))
    }

    const sending = await email.admit()
    if (!sending.ok) return sendEmailUnavailable(reply, sending.retryAfterSeconds)

    const result = await registration.requestRegistration({ email: parsed.data.email })
    const accepted: EmailRequestAccepted = { retryAfter: result.retryAfter }
    return reply.status(202).send(accepted)
  })

  app.post(
    '/api/auth/resend-verification',
    { schema: resendVerificationSchema },
    async (request, reply) => {
      // Fechado o cadastro, não há pendência nova a refazer; quem já tinha o link ainda o confirma.
      if (!config.registrationEnabled) return sendError(reply, 403, 'registration-closed')

      const admission = await registration.admitResend(request.clientAddress)
      if (!admission.ok)
        return sendTooManyAttempts(reply, admission.retryAfterSeconds, TOO_MANY_WITH_BODY)

      const body: unknown = request.body
      const parsed = resendVerificationRequestSchema.safeParse(body)
      if (!parsed.success) {
        return sendError(reply, 400, 'invalid-input', invalidFields(parsed.error.issues))
      }

      const sending = await email.admit()
      if (!sending.ok) return sendEmailUnavailable(reply, sending.retryAfterSeconds)

      const accepted: EmailRequestAccepted = await registration.resendVerification(
        parsed.data.email,
      )
      return reply.status(202).send(accepted)
    },
  )

  // Funciona mesmo com o cadastro fechado: confirma uma pendência que já existia. A senha é
  // escolhida aqui; com senha inválida o link não é gasto.
  app.post('/api/auth/verify-email', { schema: verifyEmailSchema }, async (request, reply) => {
    const admission = await registration.admitVerify(request.clientAddress)
    if (!admission.ok)
      return sendTooManyAttempts(reply, admission.retryAfterSeconds, TOO_MANY_WITH_BODY)

    const body: unknown = request.body
    const parsed = verifyEmailRequestSchema.safeParse(body)
    if (!parsed.success) {
      return sendError(reply, 400, 'invalid-input', invalidFields(parsed.error.issues))
    }

    const result = await registration.verifyEmail(parsed.data)
    if (!result.ok) return sendError(reply, 400, 'invalid-token')
    return reply.status(200).send({})
  })

  // A recuperação atende contas que já existem, então não depende da chave do cadastro.
  app.post(
    '/api/auth/forgot-password',
    { schema: forgotPasswordSchema },
    async (request, reply) => {
      const admission = await recovery.admitForgot(request.clientAddress)
      if (!admission.ok)
        return sendTooManyAttempts(reply, admission.retryAfterSeconds, TOO_MANY_WITH_BODY)

      const body: unknown = request.body
      const parsed = forgotPasswordRequestSchema.safeParse(body)
      if (!parsed.success) {
        return sendError(reply, 400, 'invalid-input', invalidFields(parsed.error.issues))
      }

      const sending = await email.admit()
      if (!sending.ok) return sendEmailUnavailable(reply, sending.retryAfterSeconds)

      const accepted: EmailRequestAccepted = await recovery.requestReset(parsed.data.email)
      return reply.status(202).send(accepted)
    },
  )

  app.post('/api/auth/reset-password', { schema: resetPasswordSchema }, async (request, reply) => {
    const admission = await recovery.admitReset(request.clientAddress)
    if (!admission.ok)
      return sendTooManyAttempts(reply, admission.retryAfterSeconds, TOO_MANY_WITH_BODY)

    // O corpo vem antes do token: uma senha inválida não consome o link.
    const body: unknown = request.body
    const parsed = resetPasswordRequestSchema.safeParse(body)
    if (!parsed.success) {
      return sendError(reply, 400, 'invalid-input', invalidFields(parsed.error.issues))
    }

    const result = await recovery.resetPassword(parsed.data)
    if (!result.ok) return sendError(reply, 400, 'invalid-token')
    clearSessionCookie(reply)
    return reply.status(200).send({})
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
