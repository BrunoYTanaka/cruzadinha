import type { FastifyPluginAsync } from 'fastify'
import type { DatabaseProbe } from '../../platform/db/probe'
import { healthSchema, liveSchema } from './health.schemas'
import { getHealth, type ReleaseInfo } from './health.service'

export const healthRoutes: FastifyPluginAsync<{
  probe: DatabaseProbe
  release: ReleaseInfo
}> = async (app, { probe, release }) => {
  app.get('/api/health', { schema: healthSchema }, () => getHealth(probe, release))
  app.get('/api/live', { schema: liveSchema }, () => ({ status: 'ok' }))
}
