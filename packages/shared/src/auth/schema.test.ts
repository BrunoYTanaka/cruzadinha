import { describe, expect, it } from 'vitest'
import {
  authResponseSchema,
  emailSchema,
  loginRequestSchema,
  passwordSchema,
  registerRequestSchema,
} from './schema'

describe('emailSchema', () => {
  it('trims and lowercases', () => {
    expect(emailSchema.parse(' Ana@X.com ')).toBe('ana@x.com')
  })

  it.each(['ana', '', `${'a'.repeat(250)}@x.com`])('rejects %s', (email) => {
    expect(emailSchema.safeParse(email).success).toBe(false)
  })
})

describe('passwordSchema', () => {
  it('accepts 8 and 128 characters and keeps spaces', () => {
    expect(passwordSchema.parse('12345678')).toBe('12345678')
    expect(passwordSchema.parse(' '.repeat(2) + 'a'.repeat(126))).toHaveLength(128)
  })

  it('rejects 7 and 129 characters', () => {
    expect(passwordSchema.safeParse('1234567').success).toBe(false)
    expect(passwordSchema.safeParse('a'.repeat(129)).success).toBe(false)
  })
})

describe('registerRequestSchema', () => {
  const valid = { email: 'ana@x.com', password: 'senha-boa-123', inviteCode: 'qualquer-coisa' }

  it('does not check the invite code format', () => {
    expect(registerRequestSchema.parse(valid).inviteCode).toBe('qualquer-coisa')
  })

  it('rejects an empty or too long invite code and extra properties', () => {
    expect(registerRequestSchema.safeParse({ ...valid, inviteCode: '' }).success).toBe(false)
    expect(registerRequestSchema.safeParse({ ...valid, inviteCode: 'a'.repeat(65) }).success).toBe(
      false,
    )
    expect(registerRequestSchema.safeParse({ ...valid, extra: 1 }).success).toBe(false)
  })
})

describe('loginRequestSchema', () => {
  it('accepts passwords of 1 to 128 characters', () => {
    expect(loginRequestSchema.safeParse({ email: 'ana@x.com', password: 'a' }).success).toBe(true)
    expect(
      loginRequestSchema.safeParse({ email: 'ana@x.com', password: 'a'.repeat(129) }).success,
    ).toBe(false)
    expect(loginRequestSchema.safeParse({ email: 'ana@x.com', password: '' }).success).toBe(false)
  })

  it('is strict', () => {
    expect(
      loginRequestSchema.safeParse({ email: 'ana@x.com', password: 'a', remember: true }).success,
    ).toBe(false)
  })
})

describe('authResponseSchema', () => {
  it('accepts the user id and e-mail', () => {
    const body = { user: { id: '0b6f0c1e-4b7a-4e1f-9a62-1f6c7d2c9e10', email: 'ana@x.com' } }
    expect(authResponseSchema.parse(body)).toEqual(body)
  })
})
