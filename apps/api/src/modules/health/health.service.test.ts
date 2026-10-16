import { healthStatusSchema } from '@cruzadinha/shared'
import { describe, expect, it } from 'vitest'
import type { DatabaseProbe } from '../../db/probe'
import { getHealth } from './health.service'

function probe(check: () => Promise<boolean>): DatabaseProbe {
  return { check, close: async () => {} }
}

const release = { version: '0.2.0', commit: undefined }

describe('getHealth', () => {
  it('reports the database up', async () => {
    expect(
      await getHealth(
        probe(async () => true),
        release,
      ),
    ).toEqual({
      status: 'ok',
      database: 'up',
      version: '0.2.0',
    })
  })

  it('reports the database down', async () => {
    expect(
      await getHealth(
        probe(async () => false),
        release,
      ),
    ).toMatchObject({
      status: 'ok',
      database: 'down',
    })
  })

  it('reports the database down when the probe rejects', async () => {
    const failing = probe(() => Promise.reject(new Error('boom')))
    expect(await getHealth(failing, release)).toMatchObject({ database: 'down' })
  })

  it('includes the commit only when known', async () => {
    const withCommit = await getHealth(
      probe(async () => true),
      {
        version: '0.2.0',
        commit: 'abcdef1',
      },
    )
    expect(withCommit.commit).toBe('abcdef1')
    const withoutCommit = await getHealth(
      probe(async () => true),
      release,
    )
    expect(withoutCommit).not.toHaveProperty('commit')
  })

  it('matches the shared health schema', async () => {
    const health = await getHealth(
      probe(async () => true),
      { version: '1.2.3', commit: 'a'.repeat(40) },
    )
    expect(healthStatusSchema.safeParse(health).success).toBe(true)
  })
})
