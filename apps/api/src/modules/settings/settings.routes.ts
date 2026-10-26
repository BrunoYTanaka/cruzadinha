import { saveSettingsRequestSchema, type SettingsEnvelope } from '@cruzadinha/shared'
import type { FastifyPluginAsync } from 'fastify'
import { sendError, sendTooManyAttempts } from '../../platform/http/errors'
import type { RequireSession } from '../identity'
import { getSettingsSchema, saveSettingsSchema } from './settings.schemas'
import type { SettingsService } from './settings.service'

export type SettingsRoutesOptions = {
  settings: SettingsService
  requireSession: RequireSession
}

// O corpo real tem uns 300 bytes; acima disso o Fastify recusa antes de ler (vira `invalid-input`).
const SETTINGS_BODY_LIMIT = 4096

export const settingsRoutes: FastifyPluginAsync<SettingsRoutesOptions> = async (
  app,
  { settings, requireSession },
) => {
  // O usuário vem só da sessão: nenhuma rota aceita um identificador de usuário.
  app.get(
    '/api/settings',
    { schema: getSettingsSchema, preHandler: requireSession },
    async (request, reply) => {
      if (!request.user) return sendError(reply, 401, 'unauthenticated')
      const body: SettingsEnvelope = await settings.get(request.user.id)
      return body
    },
  )

  app.put(
    '/api/settings',
    { schema: saveSettingsSchema, preHandler: requireSession, bodyLimit: SETTINGS_BODY_LIMIT },
    async (request, reply) => {
      if (!request.user) return sendError(reply, 401, 'unauthenticated')
      const parsed = saveSettingsRequestSchema.safeParse(request.body)
      if (!parsed.success) {
        // Só o primeiro nível do caminho: nomes de campos, nunca valores.
        const fields = [
          ...new Set(parsed.error.issues.map((issue) => String(issue.path[0] ?? 'body'))),
        ]
        return sendError(reply, 400, 'invalid-input', fields)
      }
      const result = await settings.save(request.user.id, parsed.data, request.clientAddress)
      if (!result.ok) {
        if (result.reason === 'too-many-attempts') {
          return sendTooManyAttempts(reply, result.retryAfterSeconds)
        }
        return sendError(reply, 400, 'invalid-input', result.fields)
      }
      const body: SettingsEnvelope = result.envelope
      return body
    },
  )
}
