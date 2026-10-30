import type { Stats } from '@cruzadinha/shared'
import type { FastifyPluginAsync } from 'fastify'
import { sendError } from '../../platform/http/errors'
import type { RequireSession } from '../identity'
import { getStatsSchema } from './stats.schemas'
import type { StatsService } from './stats.service'

export type StatsRoutesOptions = {
  stats: StatsService
  requireSession: RequireSession
}

export const statsRoutes: FastifyPluginAsync<StatsRoutesOptions> = async (
  app,
  { stats, requireSession },
) => {
  // O usuário vem só da sessão: a rota não aceita parâmetro nenhum.
  app.get(
    '/api/stats',
    { schema: getStatsSchema, preHandler: requireSession },
    async (request, reply) => {
      if (!request.user) return sendError(reply, 401, 'unauthenticated')
      const body: Stats = await stats.get(request.user.id)
      return body
    },
  )
}
