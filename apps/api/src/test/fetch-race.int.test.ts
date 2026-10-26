import { afterAll, beforeEach, describe, expect, it } from 'vitest'
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
})
