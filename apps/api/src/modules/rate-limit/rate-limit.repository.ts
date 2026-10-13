import { and, count, eq, gt, lt, min } from 'drizzle-orm'
import type { Executor } from '../../db/client'
import { rateLimitAttempts, type rateLimitActions, type rateLimitKeyTypes } from '../../db/schema'

export type RateLimitKey = {
  action: (typeof rateLimitActions)[number]
  keyType: (typeof rateLimitKeyTypes)[number]
  keyValue: string
}

export type AttemptCount = { count: number; oldest: Date | null }

export type RateLimitRepository = {
  countSince(key: RateLimitKey, since: Date): Promise<AttemptCount>
  record(keys: RateLimitKey[], now: Date): Promise<void>
  clear(key: RateLimitKey): Promise<void>
}

const RETENTION_MS = 24 * 60 * 60 * 1000

function matches(key: RateLimitKey) {
  return and(
    eq(rateLimitAttempts.action, key.action),
    eq(rateLimitAttempts.keyType, key.keyType),
    eq(rateLimitAttempts.keyValue, key.keyValue),
  )
}

export function createRateLimitRepository(db: Executor): RateLimitRepository {
  return {
    async countSince(key, since) {
      const [row] = await db
        .select({ count: count(), oldest: min(rateLimitAttempts.createdAt) })
        .from(rateLimitAttempts)
        .where(and(matches(key), gt(rateLimitAttempts.createdAt, since)))
      return { count: row?.count ?? 0, oldest: row?.oldest ?? null }
    },

    async record(keys, now) {
      if (keys.length > 0) await db.insert(rateLimitAttempts).values(keys)
      // Limpeza oportunista: nenhuma janela passa de 1 dia.
      await db
        .delete(rateLimitAttempts)
        .where(lt(rateLimitAttempts.createdAt, new Date(now.getTime() - RETENTION_MS)))
    },

    async clear(key) {
      await db.delete(rateLimitAttempts).where(matches(key))
    },
  }
}
