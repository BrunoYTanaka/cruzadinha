import { describe, expect, it } from 'vitest'
import { defaultRateLimits } from './limits'
import type { AttemptCount, RateLimitKey, RateLimitRepository } from './rate-limit.repository'
import { createRateLimiter } from './rate-limit.service'

const now = new Date('2026-10-13T12:00:00.000Z')
const key = { action: 'LOGIN', keyType: 'EMAIL', keyValue: 'ana@x.com' } as const

function repositoryReturning(result: AttemptCount): RateLimitRepository {
  return {
    countSince: async () => result,
    record: async () => {},
    insert: async () => [],
    deleteByIds: async () => {},
    clear: async () => {},
    withKeyLocks: async (_keys, run) => run(repositoryReturning(result)),
  }
}

function memoryRepository() {
  const rows = new Map<string, RateLimitKey>()
  let next = 0
  const repository: RateLimitRepository = {
    countSince: async (key) => ({
      count: [...rows.values()].filter(
        (row) =>
          row.action === key.action && row.keyType === key.keyType && row.keyValue === key.keyValue,
      ).length,
      oldest: now,
    }),
    record: async () => {},
    insert: async (keys) =>
      keys.map((key) => {
        const id = String(next++)
        rows.set(id, key)
        return id
      }),
    deleteByIds: async (ids) => {
      for (const id of ids) rows.delete(id)
    },
    clear: async () => {},
    withKeyLocks: async (_keys, run) => run(repository),
  }
  return { repository, rows }
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

describe('rate limiter reserve', () => {
  const window = { max: 2, windowMinutes: 15 }
  const addressKey = { action: 'LOGIN', keyType: 'NETWORK_ADDRESS', keyValue: '10.0.0.1' } as const

  it('admits up to the limit and keeps the rows', async () => {
    const { repository, rows } = memoryRepository()
    const limiter = createRateLimiter(repository)

    expect((await limiter.reserve([{ key, window }], now)).allowed).toBe(true)
    expect((await limiter.reserve([{ key, window }], now)).allowed).toBe(true)
    expect(rows.size).toBe(2)
  })

  it('refuses over the limit, says when the window frees and writes nothing', async () => {
    const { repository, rows } = memoryRepository()
    const limiter = createRateLimiter(repository)
    await limiter.reserve([{ key, window }], now)
    await limiter.reserve([{ key, window }], now)

    const third = await limiter.reserve(
      [
        { key, window },
        { key: addressKey, window },
      ],
      now,
    )

    expect(third).toEqual({ allowed: false, retryAfterSeconds: 15 * 60 })
    expect([...rows.values()].filter((row) => row.keyType === 'NETWORK_ADDRESS')).toHaveLength(0)
    expect(rows.size).toBe(2)
  })

  it('releases only the given keys', async () => {
    const { repository, rows } = memoryRepository()
    const limiter = createRateLimiter(repository)
    const reservation = await limiter.reserve(
      [
        { key, window },
        { key: addressKey, window },
      ],
      now,
    )
    if (!reservation.allowed) throw new Error('should be admitted')

    await reservation.release([addressKey])
    expect([...rows.values()]).toEqual([key])

    await reservation.release()
    expect(rows.size).toBe(0)
  })
})
