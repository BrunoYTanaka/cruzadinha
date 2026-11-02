import { DUEL_CODE_ALPHABET, duelCodeSchema, linkTokenSchema } from '@cruzadinha/shared'
import { describe, expect, it } from 'vitest'
import { hashToken, newCode, newLinkToken, newParticipantToken } from './duel-codes'

describe('duel codes', () => {
  it('builds an 8-character code from the unambiguous alphabet', () => {
    for (let i = 0; i < 200; i += 1) {
      const code = newCode()
      expect(code).toHaveLength(8)
      expect(duelCodeSchema.safeParse(code).success).toBe(true)
      for (const char of code) expect(DUEL_CODE_ALPHABET).toContain(char)
    }
  })

  it('has no ambiguous characters in the alphabet', () => {
    for (const char of '01OIL') expect(DUEL_CODE_ALPHABET).not.toContain(char)
  })

  it('makes long, distinct tokens that the schema accepts', () => {
    const tokens = new Set<string>()
    for (let i = 0; i < 10_000; i += 1) tokens.add(newLinkToken())
    expect(tokens.size).toBe(10_000)
    expect(linkTokenSchema.safeParse(newLinkToken()).success).toBe(true)
    expect(newParticipantToken()).not.toBe(newParticipantToken())
  })

  it('hashes to a stable 64-character hex digest', () => {
    const token = newParticipantToken()
    expect(hashToken(token)).toBe(hashToken(token))
    expect(hashToken(token)).toMatch(/^[0-9a-f]{64}$/)
    expect(hashToken(token)).not.toContain(token)
  })
})
