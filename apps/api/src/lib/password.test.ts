import { describe, expect, it } from 'vitest'
import { createDummyHash, hashPassword, verifyPassword } from './password'

describe('password', () => {
  it('hashes with argon2id and verifies only the right password', async () => {
    const hash = await hashPassword('senha-boa-123')
    expect(hash.startsWith('$argon2id$')).toBe(true)
    expect(await verifyPassword(hash, 'senha-boa-123')).toBe(true)
    expect(await verifyPassword(hash, 'senha-ruim-123')).toBe(false)
  })

  it('keeps spaces at the ends of the password', async () => {
    const hash = await hashPassword(' senha-boa-123 ')
    expect(await verifyPassword(hash, ' senha-boa-123 ')).toBe(true)
    expect(await verifyPassword(hash, 'senha-boa-123')).toBe(false)
  })

  it('returns false instead of throwing for a malformed hash', async () => {
    expect(await verifyPassword('não é um hash', 'qualquer')).toBe(false)
  })

  it('creates a dummy hash that verifies nothing useful', async () => {
    const dummy = await createDummyHash()
    expect(dummy.startsWith('$argon2id$')).toBe(true)
    expect(await verifyPassword(dummy, 'senha-boa-123')).toBe(false)
  })
})
