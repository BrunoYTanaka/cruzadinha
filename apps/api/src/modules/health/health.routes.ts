import type { FastifyPluginAsync } from 'fastify'
import type { DatabaseProbe } from '../../db/probe'
import { getHealth } from './health.service'

export const healthRoutes: FastifyPluginAsync<{ probe: DatabaseProbe }> = async (
  app,
  { probe },
) => {
  app.get('/api/health', () => getHealth(probe))
}
