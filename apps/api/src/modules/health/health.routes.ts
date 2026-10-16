import type { FastifyPluginAsync } from 'fastify'
import type { DatabaseProbe } from '../../db/probe'
import { healthSchema } from './health.schemas'
import { getHealth, type ReleaseInfo } from './health.service'

export const healthRoutes: FastifyPluginAsync<{
  probe: DatabaseProbe
  release: ReleaseInfo
}> = async (app, { probe, release }) => {
  app.get('/api/health', { schema: healthSchema }, () => getHealth(probe, release))
}
