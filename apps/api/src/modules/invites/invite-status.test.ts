import { describe, expect, it } from 'vitest'
import { inviteStatus } from './invite-status'

const now = new Date('2026-10-13T12:00:00.000Z')
const past = new Date(now.getTime() - 1000)
const future = new Date(now.getTime() + 1000)

describe('inviteStatus', () => {
  it('puts used before revoked and expired', () => {
    expect(inviteStatus({ usedAt: past, revokedAt: null, expiresAt: past }, now)).toBe('used')
  })

  it('puts revoked before expired', () => {
    expect(inviteStatus({ usedAt: null, revokedAt: past, expiresAt: past }, now)).toBe('revoked')
  })

  it('is expired from the instant of expiry on', () => {
    expect(inviteStatus({ usedAt: null, revokedAt: null, expiresAt: now }, now)).toBe('expired')
  })

  it('is active otherwise', () => {
    expect(inviteStatus({ usedAt: null, revokedAt: null, expiresAt: future }, now)).toBe('active')
  })
})
