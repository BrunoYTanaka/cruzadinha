import {
  forgotPasswordRequestSchema,
  resetPasswordRequestSchema,
  type EmailRequestAccepted,
} from '@cruzadinha/shared'
import type { FastifyPluginAsync } from 'fastify'
import type { CaptchaGuard } from '../../../platform/captcha'
import {
  sendCaptchaFailed,
  sendEmailUnavailable,
  sendError,
  sendTooManyAttempts,
} from '../../../platform/http/errors'
import type { EmailService } from '../../../platform/email'
import { clearSessionCookie } from '../sessions/session-cookie'
import { invalidFields, TOO_MANY_WITH_BODY } from '../route-helpers'
import { forgotPasswordSchema, resetPasswordSchema } from './recovery.schemas'
import type { RecoveryService } from './recovery.service'

export type RecoveryRoutesOptions = {
  email: EmailService
  captcha: CaptchaGuard
  recovery: RecoveryService
}

export const recoveryRoutes: FastifyPluginAsync<RecoveryRoutesOptions> = async (
  app,
  { email, captcha, recovery },
) => {
  // A recuperação atende contas que já existem, então não depende da chave do cadastro.
  app.post(
    '/api/auth/forgot-password',
    { schema: forgotPasswordSchema },
    async (request, reply) => {
      // Antes de qualquer limite ou consulta: sem prova válida nada é gasto (feature 049).
      if (!(await captcha.check(request, 'forgot'))) return sendCaptchaFailed(reply)

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
}
