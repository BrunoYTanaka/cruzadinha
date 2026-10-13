import { describe, expect, it } from 'vitest'
import {
  createdInviteSchema,
  inviteCodeSchema,
  inviteListSchema,
  inviteStatusSchema,
} from './schema'

describe('inviteCodeSchema', () => {
  it('normalizes case, spaces and hyphens', () => {
    expect(inviteCodeSchema.parse('abcd-efgh jkmn-pqrs')).toBe('ABCDEFGHJKMNPQRS')
  })

  it.each([
    'ABCDEFGHJKMNPQR',
    'ABCDEFGHJKMNPQRST',
    'ABCDEFGHJKMNPQRO',
    '0BCDEFGHJKMNPQRS',
    'IBCDEFGHJKMNPQRS',
    '1BCDEFGHJKMNPQRS',
    'LBCDEFGHJKMNPQRS',
  ])('rejects %s', (code) => {
    expect(inviteCodeSchema.safeParse(code).success).toBe(false)
  })
})

describe('inviteStatusSchema', () => {
  it('accepts the four statuses', () => {
    for (const status of ['active', 'used', 'expired', 'revoked']) {
      expect(inviteStatusSchema.parse(status)).toBe(status)
    }
  })
})

describe('createdInviteSchema', () => {
  it('requires the grouped code and an ISO date', () => {
    expect(
      createdInviteSchema.safeParse({
        code: 'ABCD-EFGH-JKMN-PQRS',
        expiresAt: '2026-10-20T12:00:00.000Z',
      }).success,
    ).toBe(true)
    expect(
      createdInviteSchema.safeParse({
        code: 'ABCDEFGHJKMNPQRS',
        expiresAt: '2026-10-20T12:00:00.000Z',
      }).success,
    ).toBe(false)
    expect(
      createdInviteSchema.safeParse({ code: 'ABCD-EFGH-JKMN-PQRS', expiresAt: 'amanhã' }).success,
    ).toBe(false)
  })
})

describe('inviteListSchema', () => {
  it('accepts an empty list', () => {
    expect(inviteListSchema.parse({ invites: [] })).toEqual({ invites: [] })
  })
})
