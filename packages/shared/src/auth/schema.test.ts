import { describe, expect, it } from 'vitest'
import {
  authResponseSchema,
  changeEmailRequestSchema,
  changePasswordRequestSchema,
  confirmEmailChangeRequestSchema,
  deleteAccountRequestSchema,
  emailRequestAcceptedSchema,
  emailSchema,
  forgotPasswordRequestSchema,
  loginRequestSchema,
  passwordSchema,
  registerRequestSchema,
  registrationStatusSchema,
  resendVerificationRequestSchema,
  resetPasswordRequestSchema,
  tokenSchema,
  verifyEmailRequestSchema,
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
  const valid = { email: 'ana@x.com' }

  it('accepts the e-mail only, with no password', () => {
    expect(registerRequestSchema.parse(valid)).toEqual(valid)
  })

  it('rejects the removed invite code and extra properties', () => {
    expect(
      registerRequestSchema.safeParse({ ...valid, inviteCode: 'qualquer-coisa' }).success,
    ).toBe(false)
    expect(registerRequestSchema.safeParse({ ...valid, password: 'senha-boa-123' }).success).toBe(
      false,
    )
    expect(registerRequestSchema.safeParse({ ...valid, extra: 1 }).success).toBe(false)
  })
})

describe('registrationStatusSchema', () => {
  it('accepts the open flag and drops unknown keys', () => {
    expect(registrationStatusSchema.parse({ open: true, captchaRequired: true, extra: 1 })).toEqual(
      { open: true, captchaRequired: true },
    )
  })

  it('reads a missing captchaRequired (previous API) as false', () => {
    expect(registrationStatusSchema.parse({ open: true })).toEqual({
      open: true,
      captchaRequired: false,
    })
  })

  it('rejects a non-boolean flag', () => {
    expect(registrationStatusSchema.safeParse({ open: 'true' }).success).toBe(false)
    expect(registrationStatusSchema.safeParse({}).success).toBe(false)
  })
})

describe('captchaToken in the e-mail requests', () => {
  const schemas = [
    ['register', registerRequestSchema],
    ['resend-verification', resendVerificationRequestSchema],
    ['forgot-password', forgotPasswordRequestSchema],
  ] as const

  it.each(schemas)(
    '%s accepts an absent token and one of 1 to 2048 characters',
    (_name, schema) => {
      const email = 'ana@x.com'
      expect(schema.safeParse({ email }).success).toBe(true)
      expect(schema.safeParse({ email, captchaToken: 'a' }).success).toBe(true)
      expect(schema.safeParse({ email, captchaToken: 'a'.repeat(2048) }).success).toBe(true)
    },
  )

  it.each(schemas)(
    '%s rejects an empty or 2049-character token and stays strict',
    (_name, schema) => {
      const email = 'ana@x.com'
      expect(schema.safeParse({ email, captchaToken: '' }).success).toBe(false)
      expect(schema.safeParse({ email, captchaToken: 'a'.repeat(2049) }).success).toBe(false)
      expect(schema.safeParse({ email, extra: 1 }).success).toBe(false)
    },
  )
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

  it('drops unknown fields in the response (FR-025)', () => {
    const user = { id: '0b6f0c1e-4b7a-4e1f-9a62-1f6c7d2c9e10', email: 'ana@x.com' }
    const parsed = authResponseSchema.parse({ user: { ...user, name: 'Ana' }, extra: 1 })
    expect(parsed).toEqual({ user })
  })
})

describe('e-mail confirmation and recovery schemas', () => {
  const token = 'a'.repeat(43)

  it('accepts a 43 character base64url token only', () => {
    expect(tokenSchema.safeParse(token).success).toBe(true)
    expect(tokenSchema.safeParse('a'.repeat(42)).success).toBe(false)
    expect(tokenSchema.safeParse('a'.repeat(44)).success).toBe(false)
    expect(tokenSchema.safeParse(`${'a'.repeat(42)}+`).success).toBe(false)
  })

  it('keeps the requests strict', () => {
    expect(
      verifyEmailRequestSchema.safeParse({ token, password: '12345678', extra: 1 }).success,
    ).toBe(false)
    expect(verifyEmailRequestSchema.safeParse({ token }).success).toBe(false)
    expect(verifyEmailRequestSchema.safeParse({ token, password: '1234567' }).success).toBe(false)
    expect(resendVerificationRequestSchema.safeParse({ email: 'ana@x.com', a: 1 }).success).toBe(
      false,
    )
    expect(forgotPasswordRequestSchema.parse({ email: ' Ana@X.com ' })).toEqual({
      email: 'ana@x.com',
    })
    expect(resetPasswordRequestSchema.safeParse({ token, password: '1234567' }).success).toBe(false)
    expect(resetPasswordRequestSchema.safeParse({ token, password: '12345678' }).success).toBe(true)
  })

  it('drops unknown keys of the accepted response', () => {
    expect(emailRequestAcceptedSchema.parse({ retryAfter: 60, extra: 1 })).toEqual({
      retryAfter: 60,
    })
    expect(emailRequestAcceptedSchema.safeParse({ retryAfter: 0 }).success).toBe(false)
  })
})

describe('account management requests', () => {
  it('accepts a change-password body and applies the sign-up password rule to the new one', () => {
    expect(
      changePasswordRequestSchema.safeParse({ currentPassword: 'x', newPassword: 'longenough' })
        .success,
    ).toBe(true)
    expect(
      changePasswordRequestSchema.safeParse({ currentPassword: 'x', newPassword: 'short' }).success,
    ).toBe(false)
  })

  it('normalises the new e-mail and rejects unknown keys', () => {
    expect(
      changeEmailRequestSchema.parse({ currentPassword: 'x', newEmail: ' Ana@X.com ' }).newEmail,
    ).toBe('ana@x.com')
    expect(deleteAccountRequestSchema.safeParse({ currentPassword: 'x', extra: 1 }).success).toBe(
      false,
    )
    expect(deleteAccountRequestSchema.safeParse({ currentPassword: '' }).success).toBe(false)
  })

  it('requires a token of 43 characters to confirm an e-mail change', () => {
    expect(confirmEmailChangeRequestSchema.safeParse({ token: 'A'.repeat(43) }).success).toBe(true)
    expect(confirmEmailChangeRequestSchema.safeParse({ token: 'abc' }).success).toBe(false)
  })
})
