import { describe, expect, it } from 'vitest'
import { generateSessionToken, sha256Hex } from './tokens'

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
