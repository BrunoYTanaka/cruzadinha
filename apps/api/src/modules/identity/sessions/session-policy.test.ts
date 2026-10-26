import { describe, expect, it } from 'vitest'
import { decideSession } from './session-policy'

const DAY = 24 * 60 * 60 * 1000
const now = new Date('2026-10-13T12:00:00.000Z')
const at = (days: number) => new Date(now.getTime() + days * DAY)

describe('decideSession', () => {
  it('reports an ended session', () => {
    expect(
      decideSession({ expiresAt: at(10), absoluteExpiresAt: at(300), endedAt: at(-1) }, now),
    ).toEqual({ status: 'ended' })
  })

  it('expires exactly at expiresAt and is valid 1 ms before', () => {
    const session = { expiresAt: now, absoluteExpiresAt: at(300), endedAt: null }
    expect(decideSession(session, now)).toEqual({ status: 'expired' })
    expect(decideSession(session, new Date(now.getTime() - 1)).status).toBe('active')
  })

  it('does not renew when the last renewal was less than a day ago', () => {
    expect(
      decideSession({ expiresAt: at(29.5), absoluteExpiresAt: at(300), endedAt: null }, now),
    ).toEqual({ status: 'active' })
  })

  it('renews to 30 days from now after a day', () => {
    expect(
      decideSession({ expiresAt: at(28), absoluteExpiresAt: at(300), endedAt: null }, now),
    ).toEqual({ status: 'active', renewTo: at(30) })
  })

  it('never renews past the absolute limit', () => {
    expect(
      decideSession({ expiresAt: at(5), absoluteExpiresAt: at(10), endedAt: null }, now),
    ).toEqual({ status: 'active', renewTo: at(10) })
    expect(
      decideSession({ expiresAt: at(10), absoluteExpiresAt: at(10), endedAt: null }, now),
    ).toEqual({ status: 'active' })
  })
})
