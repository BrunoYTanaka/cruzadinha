import {
  changeEmailRequestSchema,
  changePasswordRequestSchema,
  confirmEmailChangeRequestSchema,
  deleteAccountRequestSchema,
  type EmailRequestAccepted,
} from '@cruzadinha/shared'
import type { FastifyPluginAsync, FastifyReply } from 'fastify'
import { sendEmailUnavailable, sendError, sendTooManyAttempts } from '../../../platform/http/errors'
import type { EmailService } from '../../../platform/email'
import { invalidFields, TOO_MANY_WITH_BODY } from '../route-helpers'
import { clearSessionCookie, SESSION_COOKIE } from '../sessions/session-cookie'
import type { RequireSession } from '../sessions/session.plugin'
import { sha256Hex } from '../../../platform/lib/tokens'
import {
  changeEmailSchema,
  changePasswordSchema,
  confirmEmailChangeSchema,
  deleteAccountSchema,
  logoutOthersSchema,
} from './account.schemas'
import type { AccountResult, AccountService } from './account.service'

export type AccountRoutesOptions = {
  email: EmailService
  account: AccountService
  requireSession: RequireSession
}

// Senha errada é 400, nunca 401: o site trata 401 como sessão encerrada.
function refuse(reply: FastifyReply, result: Exclude<AccountResult, { ok: true }>) {
  return result.reason === 'too-many-attempts'
    ? sendTooManyAttempts(reply, result.retryAfterSeconds, TOO_MANY_WITH_BODY)
    : sendError(reply, 400, 'wrong-password')
}

export const accountRoutes: FastifyPluginAsync<AccountRoutesOptions> = async (
  app,
  { email, account, requireSession },
) => {
  // O hash do cookie atual: a sessão que fica de pé quando as outras são encerradas.
  const keepHash = (cookie: string | undefined) => sha256Hex(cookie ?? '')

  app.post(
    '/api/auth/change-password',
    { schema: changePasswordSchema, preHandler: requireSession },
    async (request, reply) => {
      const body: unknown = request.body
      const parsed = changePasswordRequestSchema.safeParse(body)
      if (!parsed.success) {
        return sendError(reply, 400, 'invalid-input', invalidFields(parsed.error.issues))
      }
      if (!request.user) return sendError(reply, 401, 'unauthenticated')
      const result = await account.changePassword({
        userId: request.user.id,
        keepTokenHash: keepHash(request.cookies[SESSION_COOKIE]),
        ...parsed.data,
      })
      if (!result.ok) return refuse(reply, result)
      return reply.status(200).send({})
    },
  )

  app.post(
    '/api/auth/logout-others',
    { schema: logoutOthersSchema, preHandler: requireSession },
    async (request, reply) => {
      if (!request.user) return sendError(reply, 401, 'unauthenticated')
      const body: unknown = request.body ?? {}
      if (typeof body !== 'object' || body === null || Object.keys(body).length > 0) {
        return sendError(reply, 400, 'invalid-input')
      }
      await account.logoutOthers({
        userId: request.user.id,
        keepTokenHash: keepHash(request.cookies[SESSION_COOKIE]),
      })
      return reply.status(200).send({})
    },
  )

  app.post(
    '/api/auth/change-email',
    { schema: changeEmailSchema, preHandler: requireSession },
    async (request, reply) => {
      if (!request.user) return sendError(reply, 401, 'unauthenticated')
      const admission = await account.admitChangeEmail(request.clientAddress)
      if (!admission.ok) {
        return sendTooManyAttempts(reply, admission.retryAfterSeconds, TOO_MANY_WITH_BODY)
      }
      const body: unknown = request.body
      const parsed = changeEmailRequestSchema.safeParse(body)
      if (!parsed.success) {
        return sendError(reply, 400, 'invalid-input', invalidFields(parsed.error.issues))
      }
      const sending = await email.admit()
      if (!sending.ok) return sendEmailUnavailable(reply, sending.retryAfterSeconds)

      const result = await account.requestEmailChange({
        userId: request.user.id,
        ...parsed.data,
      })
      if (!result.ok) {
        return result.reason === 'same-email'
          ? sendError(reply, 400, 'invalid-input', ['newEmail'])
          : refuse(reply, result)
      }
      const accepted: EmailRequestAccepted = { retryAfter: result.retryAfter }
      return reply.status(202).send(accepted)
    },
  )

  // O link é a prova de posse, então não pede sessão nem o cadastro aberto.
  app.post(
    '/api/auth/confirm-email-change',
    { schema: confirmEmailChangeSchema },
    async (request, reply) => {
      const admission = await account.admitConfirm(request.clientAddress)
      if (!admission.ok) {
        return sendTooManyAttempts(reply, admission.retryAfterSeconds, TOO_MANY_WITH_BODY)
      }
      const body: unknown = request.body
      const parsed = confirmEmailChangeRequestSchema.safeParse(body)
      if (!parsed.success) {
        return sendError(reply, 400, 'invalid-input', invalidFields(parsed.error.issues))
      }
      const result = await account.confirmEmailChange(parsed.data)
      if (!result.ok) return sendError(reply, 400, 'invalid-token')
      return reply.status(200).send({})
    },
  )

  app.post(
    '/api/auth/delete-account',
    { schema: deleteAccountSchema, preHandler: requireSession },
    async (request, reply) => {
      const body: unknown = request.body
      const parsed = deleteAccountRequestSchema.safeParse(body)
      if (!parsed.success) {
        return sendError(reply, 400, 'invalid-input', invalidFields(parsed.error.issues))
      }
      if (!request.user) return sendError(reply, 401, 'unauthenticated')
      const result = await account.deleteAccount({
        userId: request.user.id,
        currentPassword: parsed.data.currentPassword,
      })
      if (!result.ok) return refuse(reply, result)
      clearSessionCookie(reply)
      return reply.status(200).send({})
    },
  )
}
