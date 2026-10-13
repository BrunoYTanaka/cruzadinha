import type { LibraryResponse } from '@cruzadinha/shared'
import type { FastifyPluginAsync } from 'fastify'
import { sendError } from '../../http/errors'
import type { RequireSession } from '../auth/session.plugin'
import { getLibrarySchema } from './library.schemas'
import type { LibraryService } from './library.service'

export type LibraryRoutesOptions = {
  library: LibraryService
  requireSession: RequireSession
}

export const libraryRoutes: FastifyPluginAsync<LibraryRoutesOptions> = async (
  app,
  { library, requireSession },
) => {
  // O usuário vem só da sessão: a rota não lê nenhum parâmetro.
  app.get(
    '/api/library',
    { schema: getLibrarySchema, preHandler: requireSession },
    async (request, reply) => {
      if (!request.user) return sendError(reply, 401, 'unauthenticated')
      const body: LibraryResponse = { items: await library.list(request.user.id) }
      return body
    },
  )
}
