import { emailSchema, passwordSchema, registerRequestSchema } from '@cruzadinha/shared'
import { describe, expect, it } from 'vitest'
import { errorResponse, toDocSchema, withFieldDescription } from './doc-schema'

describe('toDocSchema', () => {
  it('keeps the e-mail rules the API applies, without the $schema key', () => {
    const schema = toDocSchema(emailSchema)

    expect(schema).toMatchObject({ type: 'string', format: 'email', maxLength: 254 })
    expect(schema).not.toHaveProperty('$schema')
  })

  it('keeps the password length limits', () => {
    expect(toDocSchema(passwordSchema)).toMatchObject({ minLength: 8, maxLength: 128 })
  })
})

describe('errorResponse', () => {
  it('describes the API error body', () => {
    const response = errorResponse('x')

    expect(response.description).toBe('x')
    expect(response.required).toEqual(expect.arrayContaining(['error', 'message']))
  })
})

describe('withFieldDescription', () => {
  it('adds the description only to the requested field, without changing the input', () => {
    const schema = toDocSchema(registerRequestSchema)
    const before = structuredClone(schema)

    const described = withFieldDescription(schema, 'email', 'texto')

    expect(described.properties?.email).toMatchObject({ description: 'texto', format: 'email' })
    expect(described.properties?.password).toEqual(schema.properties?.password)
    expect(schema).toEqual(before)
  })
})
