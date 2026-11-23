import { afterAll, beforeEach, describe, expect, it, vi } from 'vitest'
import { addDaysToIsoDate, todayInSaoPaulo } from '../platform/lib/dates'
import { createPuzzlesService } from '../modules/puzzles/puzzles.service'
import {
  createRateLimitRepository,
  createRateLimiter,
  defaultRateLimits,
} from '../platform/rate-limit'
import { fakeSource, okResult } from './fake-source'
import { openTestDatabase, testClock, truncateAll, type TestClock } from './database'

const handle = openTestDatabase()
const { db } = handle

const LIMIT = defaultRateLimits.puzzleFetch.max

let clock: TestClock

beforeEach(async () => {
  await truncateAll(db)
  clock = testClock()
})
afterAll(() => handle.close())

function setup() {
  const today = todayInSaoPaulo(clock.now)
  const dates = Array.from({ length: LIMIT + 10 }, (_, i) => addDaysToIsoDate(today, -(i + 1)))
  const source = fakeSource(new Map(dates.map((date) => [date, okResult(date)])))
  const service = createPuzzlesService({
    db,
    clock: clock.now,
    sources: [source],
    rateLimiter: createRateLimiter(createRateLimitRepository(db)),
    limits: defaultRateLimits,
  })
  return { service, source, dates }
}

describe('source fetch limit under simultaneous requests', () => {
  it('sends at most the limit to the source', async () => {
    const { service, source, dates } = setup()
    const results = await Promise.all(
      dates.map((date) => service.getByDate('oglobo', 'daily', date, '203.0.113.7')),
    )

    expect(source.calls).toHaveLength(LIMIT)
    const refused = results.filter((r) => !r.ok && r.reason === 'too-many-attempts')
    expect(refused).toHaveLength(dates.length - LIMIT)
    for (const r of refused) {
      expect(r.ok === false && 'retryAfterSeconds' in r && r.retryAfterSeconds).toBeGreaterThan(0)
    }
  })

  it('does not spend the limit on a saved day', async () => {
    const { service, source, dates } = setup()
    const first = dates[0]!
    await service.getByDate('oglobo', 'daily', first, '203.0.113.7')
    await Promise.all(
      Array.from({ length: 5 }, () => service.getByDate('oglobo', 'daily', first, '203.0.113.7')),
    )

    expect(source.calls).toEqual([first])
  })

  it('shares one source fetch between simultaneous requests for the same day', async () => {
    const date = addDaysToIsoDate(todayInSaoPaulo(clock.now), -3)
    let release!: () => void
    const gate = new Promise<void>((resolve) => (release = resolve))
    const source = fakeSource(new Map([[date, okResult(date)]]))
    const fetchPuzzle = source.fetchPuzzle.bind(source)
    source.fetchPuzzle = async (level, day) => {
      await gate
      return fetchPuzzle(level, day)
    }
    const limiter = createRateLimiter(createRateLimitRepository(db))
    let reserved = 0
    const service = createPuzzlesService({
      db,
      clock: clock.now,
      sources: [source],
      rateLimiter: {
        ...limiter,
        reserve: async (...args) => {
          const reservation = await limiter.reserve(...args)
          reserved += 1
          return reservation
        },
      },
      limits: defaultRateLimits,
    })

    const pending = ['203.0.113.7', '198.51.100.9'].map((address) =>
      service.getByDate('oglobo', 'daily', date, address),
    )
    await vi.waitFor(() => expect(reserved).toBe(2))
    release()
    const results = await Promise.all(pending)

    expect(source.calls).toEqual([date])
    expect(results.map((r) => r.ok)).toEqual([true, true])
    expect(results[0]).toEqual(results[1])
  })
})
