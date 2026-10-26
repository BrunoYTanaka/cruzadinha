import { eq, sql } from 'drizzle-orm'
import { afterAll, beforeEach, describe, expect, it, inject } from 'vitest'
import { runMigrations } from '../platform/db/migrations'
import { users } from '../platform/db/schema'
import { openTestDatabase, tableNames, truncateAll } from './database'

const handle = openTestDatabase()
const { db } = handle

beforeEach(() => truncateAll(db))
afterAll(() => handle.close())

describe('schema', () => {
  it('has exactly the tables of this feature', async () => {
    expect(await tableNames(db)).toEqual([
      'email_send_block',
      'password_reset_tokens',
      'pending_registrations',
      'progress',
      'puzzles',
      'rate_limit_attempts',
      'sessions',
      'user_settings',
      'users',
    ])
  })

  // Guarda das tabelas futuras (FR-003): toda tabela tem as duas datas e o trigger.
  it('gives every table created_at, updated_at and the updated_at trigger', async () => {
    for (const table of await tableNames(db)) {
      const columns = await db.execute<{
        column_name: string
        data_type: string
        is_nullable: string
        column_default: string | null
      }>(sql`
        SELECT column_name, data_type, is_nullable, column_default
        FROM information_schema.columns
        WHERE table_schema = 'public' AND table_name = ${table}
          AND column_name IN ('created_at', 'updated_at')
        ORDER BY column_name`)
      expect(
        columns.map((column) => column.column_name),
        table,
      ).toEqual(['created_at', 'updated_at'])
      for (const column of columns) {
        expect(column.data_type, `${table}.${column.column_name}`).toBe('timestamp with time zone')
        expect(column.is_nullable, `${table}.${column.column_name}`).toBe('NO')
        expect(column.column_default, `${table}.${column.column_name}`).toContain('now()')
      }

      const triggers = await db.execute<{ tgname: string }>(sql`
        SELECT tgname FROM pg_trigger
        WHERE tgrelid = ${`public.${table}`}::regclass AND NOT tgisinternal`)
      expect(
        triggers.map((trigger) => trigger.tgname),
        table,
      ).toContain(`${table}_set_updated_at`)
    }
  })
})

describe('timestamps', () => {
  it('fills both dates with the same instant on insert', async () => {
    const [user] = await db
      .insert(users)
      .values({ email: 'ana@exemplo.com', passwordHash: 'hash' })
      .returning()
    expect(user?.createdAt).toBeInstanceOf(Date)
    expect(user?.updatedAt.getTime()).toBe(user?.createdAt.getTime())
  })

  it('advances only updated_at on update', async () => {
    const [created] = await db
      .insert(users)
      .values({ email: 'ana@exemplo.com', passwordHash: 'hash' })
      .returning()
    if (!created) throw new Error('insert returned nothing')

    const [updated] = await db
      .update(users)
      .set({ email: 'bia@exemplo.com' })
      .where(eq(users.userId, created.userId))
      .returning()

    expect(updated?.createdAt.getTime()).toBe(created.createdAt.getTime())
    expect(updated?.updatedAt.getTime()).toBeGreaterThan(created.updatedAt.getTime())
  })
})

describe('migrations', () => {
  it('can be applied again without changes', async () => {
    const count = async () => {
      const rows = await db.execute<{ total: number }>(
        sql`SELECT count(*)::int AS total FROM drizzle.__drizzle_migrations`,
      )
      return rows[0]?.total
    }
    const before = await count()
    await runMigrations(inject('databaseUrl'))
    expect(await count()).toBe(before)
    expect(before).toBe(10)
  })
})
