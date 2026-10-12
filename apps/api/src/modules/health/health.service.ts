import type { HealthStatus } from '@cruzadinha/shared'
import type { DatabaseProbe } from '../../db/probe'

export async function getHealth(probe: DatabaseProbe): Promise<HealthStatus> {
  const up = await probe.check().catch(() => false)
  return { status: 'ok', database: up ? 'up' : 'down' }
}
