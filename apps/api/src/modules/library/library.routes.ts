import { puzzleSourceQuerySchema, type LibraryResponse } from '@cruzadinha/shared'
import type { FastifyPluginAsync } from 'fastify'
import { z } from 'zod'
import { sendError } from '../../http/errors'
import type { OptionalSession } from '../identity'
import { getLibrarySchema } from './library.schemas'
import type { LibraryService } from './library.service'

export type LibraryRoutesOptions = {
  library: LibraryService
  optionalSession: OptionalSession
}

const querySchema = z.object({ source: puzzleSourceQuerySchema })

export const libraryRoutes: FastifyPluginAsync<LibraryRoutesOptions> = async (
  app,
  { library, optionalSession },
) => {
  // O usuário vem só da sessão; o único parâmetro é a fonte (feature 014), e sem ela vale O Globo.
  // Sem sessão (visitante), só os metadados dos puzzles, sem dado de nenhum usuário (feature 013).
  app.get(
    '/api/library',
    { schema: getLibrarySchema, preHandler: optionalSession },
    async (request, reply) => {
      const query = querySchema.safeParse(request.query)
      if (!query.success) return sendError(reply, 400, 'invalid-input', ['source'])
      const { source } = query.data
      const items = request.user
        ? await library.list(request.user.id, source)
        : await library.listPublic(source)
      const body: LibraryResponse = { items }
      return body
    },
  )
}
