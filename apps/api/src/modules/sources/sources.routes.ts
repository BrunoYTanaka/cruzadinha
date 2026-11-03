import {
  updateSourcesRequestSchema,
  type AdminSourcesResponse,
  type SourcesResponse,
} from '@cruzadinha/shared'
import type { FastifyPluginAsync } from 'fastify'
import { sendError } from '../../platform/http/errors'
import type { RequireAdmin } from '../identity'
import { getAdminSourcesSchema, getSourcesSchema, putAdminSourcesSchema } from './sources.schemas'
import type { SourcesService } from './sources.service'

export type SourcesRoutesOptions = {
  sources: SourcesService
  requireAdmin: RequireAdmin
}

export const sourcesRoutes: FastifyPluginAsync<SourcesRoutesOptions> = async (
  app,
  { sources, requireAdmin },
) => {
  // Pública e sem cache: a alteração da administração chega ao público em até 1 minuto (FR-015).
  app.get('/api/sources', { schema: getSourcesSchema }, async (_request, reply) => {
    const body: SourcesResponse = { sources: await sources.listVisible() }
    return reply.header('Cache-Control', 'no-cache').send(body)
  })

  // `onRequest` roda antes da leitura do corpo: quem não é admin recebe o 404 de rota inexistente.
  app.get(
    '/api/admin/sources',
    { schema: getAdminSourcesSchema, onRequest: requireAdmin },
    async () => {
      const body: AdminSourcesResponse = { sources: await sources.listAll() }
      return body
    },
  )

  app.put(
    '/api/admin/sources',
    { schema: putAdminSourcesSchema, onRequest: requireAdmin },
    async (request, reply) => {
      const parsed = updateSourcesRequestSchema.safeParse(request.body)
      if (!parsed.success) return sendError(reply, 400, 'invalid-input', ['sources'])
      // requireAdmin garante o usuário.
      const userId = request.user?.id
      if (!userId) return reply.callNotFound()
      const result = await sources.save(userId, parsed.data)
      if (!result.ok) {
        return result.reason === 'no-visible-source'
          ? sendError(reply, 400, 'no-visible-source')
          : sendError(reply, 400, 'invalid-input', ['sources'])
      }
      const body: AdminSourcesResponse = { sources: result.sources }
      return body
    },
  )
}
