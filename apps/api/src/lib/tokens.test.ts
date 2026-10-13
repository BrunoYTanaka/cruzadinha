import { describe, expect, it } from 'vitest'
import {
  INVITE_CODE_ALPHABET,
  formatInviteCode,
  generateInviteCode,
  generateSessionToken,
  normalizeInviteCode,
  sha256Hex,
} from './tokens'

describe('generateInviteCode', () => {
  it('draws 16 characters from the alphabet without ambiguous ones', () => {
    for (let i = 0; i < 1000; i++) {
      const code = generateInviteCode()
      expect(code).toMatch(/^[ABCDEFGHJKMNPQRSTUVWXYZ23456789]{16}$/)
    }
    expect(INVITE_CODE_ALPHABET).toHaveLength(31)
    for (const ambiguous of ['0', 'O', '1', 'I', 'L']) {
      expect(INVITE_CODE_ALPHABET).not.toContain(ambiguous)
    }
  })

  it('formats in groups of four', () => {
    expect(formatInviteCode('ABCDEFGHJKMNPQRS')).toBe('ABCD-EFGH-JKMN-PQRS')
    expect(formatInviteCode(generateInviteCode())).toMatch(/^[A-Z2-9]{4}(-[A-Z2-9]{4}){3}$/)
  })

  it('normalizes case, spaces and hyphens', () => {
    expect(normalizeInviteCode(' abcd-efgh jkmn-pqrs ')).toBe('ABCDEFGHJKMNPQRS')
  })
})

describe('generateSessionToken', () => {
  it('returns distinct 43-character base64url values', () => {
    const tokens = new Set(Array.from({ length: 100 }, generateSessionToken))
    expect(tokens.size).toBe(100)
    for (const token of tokens) expect(token).toMatch(/^[A-Za-z0-9_-]{43}$/)
  })
})

describe('sha256Hex', () => {
  it('matches the known digest of "abc"', () => {
    expect(sha256Hex('abc')).toBe(
      'ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad',
    )
  })
})
