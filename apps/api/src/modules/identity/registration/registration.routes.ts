import {
  registerRequestSchema,
  resendVerificationRequestSchema,
  verifyEmailRequestSchema,
  type EmailRequestAccepted,
  type RegistrationStatus,
} from '@cruzadinha/shared'
import type { FastifyPluginAsync } from 'fastify'
import type { ServerConfig } from '../../../config'
import { sendEmailUnavailable, sendError, sendTooManyAttempts } from '../../../platform/http/errors'
import type { EmailService } from '../../../platform/email'
import { invalidFields, TOO_MANY_WITH_BODY } from '../route-helpers'
import type { RegistrationService } from './registration.service'
import {
  registerSchema,
  registrationSchema,
  resendVerificationSchema,
  verifyEmailSchema,
} from './registration.schemas'

export type RegistrationRoutesOptions = {
  config: ServerConfig
  email: EmailService
  registration: RegistrationService
}

export const registrationRoutes: FastifyPluginAsync<RegistrationRoutesOptions> = async (
  app,
  { config, email, registration },
) => {
  // Com a chave desligada, a recusa vem antes de tudo: não conta tentativa nem lê o corpo, e não
  // revela nada sobre contas (feature 013, FR-016). Aberto, o cadastro só grava uma pendência e
  // manda o link; a conta nasce em verify-email (feature 035).
  app.post('/api/auth/register', { schema: registerSchema }, async (request, reply) => {
    if (!config.registrationEnabled) return sendError(reply, 403, 'registration-closed')

    const admission = await registration.admitRegister(request.clientAddress)
    if (!admission.ok)
      return sendTooManyAttempts(reply, admission.retryAfterSeconds, TOO_MANY_WITH_BODY)

    const body: unknown = request.body
    const parsed = registerRequestSchema.safeParse(body)
    if (!parsed.success) {
      return sendError(reply, 400, 'invalid-input', invalidFields(parsed.error.issues))
    }

    const sending = await email.admit()
    if (!sending.ok) return sendEmailUnavailable(reply, sending.retryAfterSeconds)

    // O `inviteCode` do site anterior é aceito pelo schema e ignorado aqui.
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

  // Se o cadastro está aberto, para o site mostrar ou esconder "Criar conta" (FR-017).
  app.get('/api/auth/registration', { schema: registrationSchema }, async (_request, reply) => {
    const body: RegistrationStatus = { open: config.registrationEnabled }
    return reply.header('cache-control', 'no-store').send(body)
  })
}
