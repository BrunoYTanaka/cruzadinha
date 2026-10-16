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

describe('healthStatusSchema version e commit', () => {
  const base = { status: 'ok', database: 'up' }

  it('accepts a semver version and no version', () => {
    expect(healthStatusSchema.safeParse({ ...base, version: '0.1.0' }).success).toBe(true)
    expect(healthStatusSchema.safeParse({ ...base, version: '12.3.45' }).success).toBe(true)
    expect(healthStatusSchema.safeParse(base).success).toBe(true)
  })

  it('rejects a version outside MAJOR.MINOR.PATCH', () => {
    for (const version of ['v0.1.0', '0.1', '0.1.0-beta']) {
      expect(healthStatusSchema.safeParse({ ...base, version }).success).toBe(false)
    }
  })

  it('accepts a commit of 7 and 40 lowercase hex characters and no commit', () => {
    expect(healthStatusSchema.safeParse({ ...base, commit: 'abcdef1' }).success).toBe(true)
    expect(healthStatusSchema.safeParse({ ...base, commit: 'a'.repeat(40) }).success).toBe(true)
  })

  it('rejects an uppercase, too short, too long or non-hex commit', () => {
    for (const commit of ['ABCDEF1', 'abcdef', 'a'.repeat(41), 'abcdefg']) {
      expect(healthStatusSchema.safeParse({ ...base, commit }).success).toBe(false)
    }
  })

  it('drops unknown fields so an older site accepts a newer API', () => {
    const parsed = healthStatusSchema.parse({ ...base, extra: 1 })
    expect(parsed).toEqual(base)
  })
})
