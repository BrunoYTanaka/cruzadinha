import { afterAll, beforeEach, describe, expect, it } from 'vitest'
import { createPuzzlesService } from '../modules/puzzles/puzzles.service'
import { puzzles } from '../platform/db/schema'
import { todayInSaoPaulo } from '../platform/lib/dates'
import { defaultRateLimits } from '../platform/rate-limit/limits'
import { createRateLimitRepository } from '../platform/rate-limit/rate-limit.repository'
import { createRateLimiter } from '../platform/rate-limit/rate-limit.service'
import { openTestDatabase, testClock, truncateAll } from './database'
import { fakeSource, okResult } from './fake-source'

const handle = openTestDatabase()
const { db } = handle

beforeEach(() => truncateAll(db))
afterAll(() => handle.close())

describe('coleta com fonte escondida (FR-014)', () => {
  it('continua salvando a cruzada de uma fonte escondida', async () => {
    const clock = testClock()
    const today = todayInSaoPaulo(clock.now)
    const service = createPuzzlesService({
      db,
      clock: clock.now,
      sources: [fakeSource(new Map([[today, okResult(today)]]))],
      // A administração escondeu todas as fontes para o público.
      sourceVisibility: { isVisible: async () => false },
      rateLimiter: createRateLimiter(createRateLimitRepository(db)),
      limits: defaultRateLimits,
      historyDays: 0,
      sleep: async () => {},
    })

    const run = await service.collect()

    expect(run.sources[0]?.report.saved).toEqual([today])
    expect(await db.select().from(puzzles)).toHaveLength(1)
  })
})
