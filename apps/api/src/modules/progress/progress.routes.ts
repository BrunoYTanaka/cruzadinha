import { saveProgressRequestSchema, type ProgressEnvelope } from '@cruzadinha/shared'
import type { FastifyPluginAsync } from 'fastify'
import { z } from 'zod'
import { sendError } from '../../http/errors'
import type { RequireSession } from '../identity'
import { getProgressSchema, resetProgressSchema, saveProgressSchema } from './progress.schemas'
import type { ProgressService } from './progress.service'

export type ProgressRoutesOptions = {
  progress: ProgressService
  requireSession: RequireSession
}

const puzzleIdSchema = z.uuid()

export const progressRoutes: FastifyPluginAsync<ProgressRoutesOptions> = async (
  app,
  { progress, requireSession },
) => {
  // O usuário vem só da sessão: nenhuma rota aceita um identificador de usuário.
  app.get(
    '/api/progress/:puzzleId',
    { schema: getProgressSchema, preHandler: requireSession },
    async (request, reply) => {
      if (!request.user) return sendError(reply, 401, 'unauthenticated')
      const puzzleId = puzzleIdSchema.safeParse((request.params as { puzzleId?: unknown }).puzzleId)
      if (!puzzleId.success) return sendError(reply, 404, 'puzzle-unavailable')
      const result = await progress.get(request.user.id, puzzleId.data)
      if (!result.ok) return sendError(reply, 404, 'puzzle-unavailable')
      const body: ProgressEnvelope = { progress: result.progress }
      return body
    },
  )

  app.put(
    '/api/progress/:puzzleId',
    { schema: saveProgressSchema, preHandler: requireSession },
    async (request, reply) => {
      if (!request.user) return sendError(reply, 401, 'unauthenticated')
      const puzzleId = puzzleIdSchema.safeParse((request.params as { puzzleId?: unknown }).puzzleId)
      if (!puzzleId.success) return sendError(reply, 404, 'puzzle-unavailable')
      const parsed = saveProgressRequestSchema.safeParse(request.body)
      if (!parsed.success) {
        // Só o primeiro nível do caminho: nomes de campos, nunca valores.
        const fields = [
          ...new Set(parsed.error.issues.map((issue) => String(issue.path[0] ?? 'body'))),
        ]
        return sendError(reply, 400, 'invalid-input', fields)
      }
      const result = await progress.save(request.user.id, puzzleId.data, parsed.data)
      if (!result.ok) {
        if (result.reason === 'invalid-input') {
          return sendError(reply, 400, 'invalid-input', result.fields)
        }
        if (result.reason === 'progress-completed') {
          return sendError(reply, 409, 'progress-completed')
        }
        return sendError(reply, 404, 'puzzle-unavailable')
      }
      const body: ProgressEnvelope = { progress: result.progress }
      return body
    },
  )

  app.post(
    '/api/progress/:puzzleId/reset',
    { schema: resetProgressSchema, preHandler: requireSession },
    async (request, reply) => {
      if (!request.user) return sendError(reply, 401, 'unauthenticated')
      const puzzleId = puzzleIdSchema.safeParse((request.params as { puzzleId?: unknown }).puzzleId)
      if (!puzzleId.success) return sendError(reply, 404, 'puzzle-unavailable')
      const result = await progress.reset(request.user.id, puzzleId.data)
      if (!result.ok) return sendError(reply, 404, 'puzzle-unavailable')
      const body: ProgressEnvelope = { progress: result.progress }
      return body
    },
  )
}
