import type { CreatedInvite, InviteList } from '@cruzadinha/shared'
import type { FastifyPluginAsync } from 'fastify'
import { sendError, sendTooManyAttempts } from '../../http/errors'
import type { RequireSession } from '../auth/session.plugin'
import { createInviteSchema, listInvitesSchema } from './invites.schemas'
import type { InvitesService } from './invites.service'

export type InvitesRoutesOptions = {
  invites: InvitesService
  requireSession: RequireSession
}

export const invitesRoutes: FastifyPluginAsync<InvitesRoutesOptions> = async (
  app,
  { invites, requireSession },
) => {
  app.post(
    '/api/invites',
    { schema: createInviteSchema, preHandler: requireSession },
    async (request, reply) => {
      if (!request.user) return sendError(reply, 401, 'unauthenticated')
      const result = await invites.createForUser(request.user.id, request.clientAddress)
      if (!result.ok) {
        return result.reason === 'too-many-attempts'
          ? sendTooManyAttempts(reply, result.retryAfterSeconds)
          : sendError(reply, 409, 'invite-quota-reached')
      }
      const body: CreatedInvite = { code: result.code, expiresAt: result.expiresAt.toISOString() }
      return reply.status(201).send(body)
    },
  )

  app.get(
    '/api/invites',
    { schema: listInvitesSchema, preHandler: requireSession },
    async (request, reply) => {
      if (!request.user) return sendError(reply, 401, 'unauthenticated')
      const list = await invites.listForUser(request.user.id)
      const body: InviteList = {
        invites: list.map((invite) => ({
          createdAt: invite.createdAt.toISOString(),
          expiresAt: invite.expiresAt.toISOString(),
          status: invite.status,
        })),
      }
      return body
    },
  )
}
