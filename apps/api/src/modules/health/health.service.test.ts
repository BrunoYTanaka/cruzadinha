import { describe, expect, it } from 'vitest'
import type { DatabaseProbe } from '../../db/probe'
import { getHealth } from './health.service'

function probe(check: () => Promise<boolean>): DatabaseProbe {
  return { check, close: async () => {} }
}

describe('getHealth', () => {
  it('reports the database up', async () => {
    expect(await getHealth(probe(async () => true))).toEqual({ status: 'ok', database: 'up' })
  })

  it('reports the database down', async () => {
    expect(await getHealth(probe(async () => false))).toEqual({ status: 'ok', database: 'down' })
  })

  it('reports the database down when the probe rejects', async () => {
    const failing = probe(() => Promise.reject(new Error('boom')))
    expect(await getHealth(failing)).toEqual({ status: 'ok', database: 'down' })
  })
})
