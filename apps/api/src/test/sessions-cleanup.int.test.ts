import { afterAll, beforeEach, describe, expect, it } from 'vitest'
import { sessions, users } from '../platform/db/schema'
import { createAuthService } from '../modules/identity/sessions/auth.service'
import { defaultRateLimits } from '../platform/rate-limit/limits'
import { createRateLimitRepository } from '../platform/rate-limit/rate-limit.repository'
import { createRateLimiter } from '../platform/rate-limit/rate-limit.service'
import { DAY, openTestDatabase, testClock, truncateAll, type TestClock } from './database'

const handle = openTestDatabase()
const { db } = handle

let clock: TestClock
let userId: string

beforeEach(async () => {
  await truncateAll(db)
  clock = testClock()
  const [user] = await db
    .insert(users)
    .values({ email: 'ana@exemplo.com', passwordHash: 'hash' })
    .returning({ id: users.userId })
  userId = user?.id ?? ''
})
afterAll(() => handle.close())

const service = () =>
  createAuthService({
    db,
    clock: clock.now,
    rateLimiter: createRateLimiter(createRateLimitRepository(db)),
    limits: defaultRateLimits,
  })

async function addSession(
  name: string,
  times: { expires: number; absolute: number; ended?: number },
) {
  const now = clock.now().getTime()
  await db.insert(sessions).values({
    userId,
    tokenHash: name,
    expiresAt: new Date(now + times.expires),
    absoluteExpiresAt: new Date(now + times.absolute),
    endedAt: times.ended === undefined ? null : new Date(now + times.ended),
  })
}

async function remaining(): Promise<string[]> {
  const rows = await db.select({ tokenHash: sessions.tokenHash }).from(sessions)
  return rows.map((row) => row.tokenHash).sort()
}

describe('purgeStaleSessions', () => {
  it('deletes expired and long-ended sessions and keeps the rest', async () => {
    await addSession('idle-expired', { expires: -DAY, absolute: 100 * DAY })
    await addSession('absolute-expired', { expires: -2 * DAY, absolute: -DAY })
    await addSession('ended-8-days-ago', {
      expires: 20 * DAY,
      absolute: 100 * DAY,
      ended: -8 * DAY,
    })
    await addSession('ended-6-days-ago', {
      expires: 20 * DAY,
      absolute: 100 * DAY,
      ended: -6 * DAY,
    })
    await addSession('active', { expires: 20 * DAY, absolute: 100 * DAY })

    expect(await service().purgeStaleSessions()).toBe(3)
    expect(await remaining()).toEqual(['active', 'ended-6-days-ago'])
  })

  it('does nothing and does not fail without sessions', async () => {
    expect(await service().purgeStaleSessions()).toBe(0)
  })
})
