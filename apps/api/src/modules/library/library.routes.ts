import type { LibraryResponse } from '@cruzadinha/shared'
import type { FastifyPluginAsync } from 'fastify'
import type { OptionalSession } from '../auth/session.plugin'
import { getLibrarySchema } from './library.schemas'
import type { LibraryService } from './library.service'

export type LibraryRoutesOptions = {
  library: LibraryService
  optionalSession: OptionalSession
}

export const libraryRoutes: FastifyPluginAsync<LibraryRoutesOptions> = async (
  app,
  { library, optionalSession },
) => {
  // O usuário vem só da sessão: a rota não lê nenhum parâmetro. Sem sessão (visitante), só os
  // metadados dos puzzles, sem dado de nenhum usuário (feature 013, FR-002).
  app.get(
    '/api/library',
    { schema: getLibrarySchema, preHandler: optionalSession },
    async (request) => {
      const items = request.user ? await library.list(request.user.id) : await library.listPublic()
      const body: LibraryResponse = { items }
      return body
    },
  )
}
