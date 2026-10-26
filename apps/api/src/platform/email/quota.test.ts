import { describe, expect, it } from 'vitest'
import { blockedUntilFor } from './quota'

describe('blockedUntilFor', () => {
  it('daily quota ends at the next UTC midnight', () => {
    const until = blockedUntilFor('daily_quota_exceeded', new Date('2026-10-26T15:30:00Z'))
    expect(until.toISOString()).toBe('2026-10-27T00:00:00.000Z')
  })

  it('daily quota crosses the month and the year', () => {
    expect(
      blockedUntilFor('daily_quota_exceeded', new Date('2026-12-31T23:59:59Z')).toISOString(),
    ).toBe('2027-01-01T00:00:00.000Z')
  })

  it('at exactly midnight the block lasts a whole day', () => {
    expect(
      blockedUntilFor('daily_quota_exceeded', new Date('2026-10-27T00:00:00Z')).toISOString(),
    ).toBe('2026-10-28T00:00:00.000Z')
  })

  it('monthly quota ends at the start of the next UTC month', () => {
    expect(
      blockedUntilFor('monthly_quota_exceeded', new Date('2026-10-26T15:30:00Z')).toISOString(),
    ).toBe('2026-11-01T00:00:00.000Z')
    expect(
      blockedUntilFor('monthly_quota_exceeded', new Date('2026-12-15T00:00:00Z')).toISOString(),
    ).toBe('2027-01-01T00:00:00.000Z')
  })
})
