import { and, count, eq, gt, inArray, lt, min, sql } from 'drizzle-orm'
import type { Database, Executor } from '../../db/client'
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
  /** Grava uma linha por chave e devolve os ids, para quem a gravou poder devolvê-las. */
  insert(keys: RateLimitKey[]): Promise<string[]>
  deleteByIds(ids: string[]): Promise<void>
  clear(key: RateLimitKey): Promise<void>
  /**
   * Roda `run` numa transação que segura uma trava por chave até o fim. Duas chamadas com a mesma
   * chave não se sobrepõem; chaves diferentes não esperam. A trava cobre só o que `run` faz.
   */
  withKeyLocks<T>(
    keys: RateLimitKey[],
    run: (locked: RateLimitRepository) => Promise<T>,
  ): Promise<T>
}

const RETENTION_MS = 24 * 60 * 60 * 1000

function matches(key: RateLimitKey) {
  return and(
    eq(rateLimitAttempts.action, key.action),
    eq(rateLimitAttempts.keyType, key.keyType),
    eq(rateLimitAttempts.keyValue, key.keyValue),
  )
}

const lockName = (key: RateLimitKey) => `${key.action}:${key.keyType}:${key.keyValue}`

export function createRateLimitRepository(database: Database): RateLimitRepository {
  function over(db: Executor, locks: RateLimitRepository['withKeyLocks']): RateLimitRepository {
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

      async insert(keys) {
        if (keys.length === 0) return []
        const rows = await db
          .insert(rateLimitAttempts)
          .values(keys)
          .returning({ id: rateLimitAttempts.rateLimitAttemptId })
        return rows.map((row) => row.id)
      },

      async deleteByIds(ids) {
        if (ids.length > 0) {
          await db
            .delete(rateLimitAttempts)
            .where(inArray(rateLimitAttempts.rateLimitAttemptId, ids))
        }
      },

      async clear(key) {
        await db.delete(rateLimitAttempts).where(matches(key))
      },

      withKeyLocks: locks,
    }
  }

  const repository: RateLimitRepository = over(database, (keys, run) =>
    database.transaction(async (tx) => {
      // Ordem fixa para duas chamadas com as mesmas chaves não travarem uma à outra.
      const names = [...new Set(keys.map(lockName))].sort()
      for (const name of names) {
        await tx.execute(sql`select pg_advisory_xact_lock(hashtextextended(${name}, 0))`)
      }
      // Dentro da transação não há outra trava a pedir: as chaves já estão seguras.
      return run(over(tx, (_keys, inner) => inner(repository)))
    }),
  )
  return repository
}
