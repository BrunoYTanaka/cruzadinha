import { sql } from 'drizzle-orm'
import { inject } from 'vitest'
import { createDatabase, type Database, type DatabaseHandle } from '../db/client'

export function openTestDatabase(): DatabaseHandle {
  return createDatabase(inject('databaseUrl'))
}

export async function tableNames(db: Database): Promise<string[]> {
  const rows = await db.execute<{ tablename: string }>(
    sql`SELECT tablename FROM pg_tables WHERE schemaname = 'public' ORDER BY tablename`,
  )
  return rows.map((row) => row.tablename)
}

export async function truncateAll(db: Database): Promise<void> {
  const names = await tableNames(db)
  if (names.length === 0) return
  await db.execute(
    sql.raw(`TRUNCATE ${names.map((name) => `"${name}"`).join(', ')} RESTART IDENTITY CASCADE`),
  )
}

export type TestClock = { now: () => Date; advance(ms: number): void; set(date: Date): void }

// Relógio de teste: parte do instante real e só anda para frente, como o created_at do banco.
export function testClock(): TestClock {
  let current = new Date()
  return {
    now: () => new Date(current.getTime()),
    advance(ms) {
      current = new Date(current.getTime() + ms)
    },
    set(date) {
      current = date
    },
  }
}

export const MINUTE = 60 * 1000
export const DAY = 24 * 60 * MINUTE
