import type { HealthStatus } from '@cruzadinha/shared'
import type { DatabaseProbe } from '../../platform/db/probe'

export type ReleaseInfo = { version: string; commit: string | undefined }

export async function getHealth(probe: DatabaseProbe, release: ReleaseInfo): Promise<HealthStatus> {
  const up = await probe.check().catch(() => false)
  const health: HealthStatus = {
    status: 'ok',
    database: up ? 'up' : 'down',
    version: release.version,
  }
  if (release.commit) health.commit = release.commit
  return health
}
