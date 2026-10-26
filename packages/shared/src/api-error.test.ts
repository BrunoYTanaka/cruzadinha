import { describe, expect, it } from 'vitest'
import { apiErrorCodeSchema, apiErrorSchema } from './api-error'

describe('apiErrorSchema', () => {
  it.each(apiErrorCodeSchema.options)('accepts the %s code', (code) => {
    expect(apiErrorSchema.safeParse({ error: code, message: 'Mensagem.' }).success).toBe(true)
  })

  it('accepts the field list of invalid-input', () => {
    const error = { error: 'invalid-input', message: 'Dados inválidos.', fields: ['email'] }
    expect(apiErrorSchema.parse(error)).toEqual(error)
  })

  it('accepts the forbidden code', () => {
    expect(apiErrorCodeSchema.options).toContain('forbidden')
  })

  it('accepts the registration-closed code', () => {
    expect(apiErrorCodeSchema.options).toContain('registration-closed')
  })

  it('accepts the progress-completed code', () => {
    expect(apiErrorCodeSchema.options).toContain('progress-completed')
  })

  it('accepts the e-mail codes and the retryAfter seconds', () => {
    expect(apiErrorCodeSchema.options).toContain('invalid-token')
    expect(apiErrorCodeSchema.options).toContain('email-unavailable')
    const error = { error: 'email-unavailable', message: 'x', retryAfter: 60 }
    expect(apiErrorSchema.parse(error)).toEqual(error)
    expect(apiErrorSchema.safeParse({ ...error, retryAfter: 0 }).success).toBe(false)
  })

  it('rejects unknown codes and extra properties', () => {
    expect(apiErrorSchema.safeParse({ error: 'teapot', message: 'x' }).success).toBe(false)
    expect(
      apiErrorSchema.safeParse({ error: 'internal-error', message: 'x', stack: 'y' }).success,
    ).toBe(false)
  })
})
