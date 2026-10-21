import { describe, expect, it } from 'vitest'
import { defaultRateLimits } from './limits'
import type { AttemptCount, RateLimitRepository } from './rate-limit.repository'
import { createRateLimiter } from './rate-limit.service'

const now = new Date('2026-10-13T12:00:00.000Z')
const key = { action: 'LOGIN', keyType: 'EMAIL', keyValue: 'ana@x.com' } as const

function repositoryReturning(result: AttemptCount): RateLimitRepository {
  return { countSince: async () => result, record: async () => {}, clear: async () => {} }
}

describe('rate limiter', () => {
  it('allows below the limit', async () => {
    const limiter = createRateLimiter(repositoryReturning({ count: 4, oldest: now }))
    expect(await limiter.check([{ key, window: defaultRateLimits.loginEmail }], now)).toEqual({
      allowed: true,
    })
  })

  it('refuses at the limit and says when the window frees', async () => {
    const oldest = new Date(now.getTime() - 10 * 60 * 1000)
    const limiter = createRateLimiter(repositoryReturning({ count: 5, oldest }))
    expect(await limiter.check([{ key, window: defaultRateLimits.loginEmail }], now)).toEqual({
      allowed: false,
      retryAfterSeconds: 5 * 60,
    })
  })

  it('uses the default limits of the spec', () => {
    expect(defaultRateLimits).toEqual({
      loginEmail: { max: 5, windowMinutes: 15 },
      loginAddress: { max: 20, windowMinutes: 15 },
      register: { max: 10, windowMinutes: 60 },
      puzzleFetch: { max: 30, windowMinutes: 60 },
      settingsSave: { max: 120, windowMinutes: 60 },
    })
  })
})
