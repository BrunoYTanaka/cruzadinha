import { describe, expect, it } from 'vitest'
import { healthStatusSchema } from './health'

describe('healthStatusSchema', () => {
  it('accepts the database up and down', () => {
    expect(healthStatusSchema.safeParse({ status: 'ok', database: 'up' }).success).toBe(true)
    expect(healthStatusSchema.safeParse({ status: 'ok', database: 'down' }).success).toBe(true)
  })

  it('rejects other database values', () => {
    expect(healthStatusSchema.safeParse({ status: 'ok', database: 'unknown' }).success).toBe(false)
  })

  it('rejects a status other than ok', () => {
    expect(healthStatusSchema.safeParse({ status: 'error', database: 'up' }).success).toBe(false)
  })

  it('rejects missing fields', () => {
    expect(healthStatusSchema.safeParse({ status: 'ok' }).success).toBe(false)
    expect(healthStatusSchema.safeParse({ database: 'up' }).success).toBe(false)
    expect(healthStatusSchema.safeParse(null).success).toBe(false)
  })
})
