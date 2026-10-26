import { sql } from 'drizzle-orm'
import { afterAll, beforeEach, describe, expect, it } from 'vitest'
import { rateLimitAttempts } from '../platform/db/schema'
import { openTestDatabase, tableNames, truncateAll } from './database'

const handle = openTestDatabase()
const { db } = handle

beforeEach(() => truncateAll(db))
afterAll(() => handle.close())

const attempt = (action: string) =>
  db.execute(
    sql`INSERT INTO rate_limit_attempts (action, key_type, key_value) VALUES (${action}, 'EMAIL', 'ana@exemplo.com')`,
  )

describe('convites removidos (migração 0008)', () => {
  it('não tem mais a tabela invites', async () => {
    expect(await tableNames(db)).not.toContain('invites')
  })

  it('recusa a ação INVITE_CREATE', async () => {
    await expect(attempt('INVITE_CREATE')).rejects.toThrow()
  })

  it.each(['LOGIN', 'REGISTER', 'PUZZLE_FETCH', 'SETTINGS_SAVE', 'PROGRESS_SAVE'])(
    'aceita a ação %s',
    async (action) => {
      await attempt(action)
      expect(await db.select().from(rateLimitAttempts)).toHaveLength(1)
    },
  )
})
