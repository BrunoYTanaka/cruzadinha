import { eq, sql } from 'drizzle-orm'
import type { FastifyInstance } from 'fastify'
import { afterAll, afterEach, beforeEach, describe, expect, it } from 'vitest'
import { deleteExpiredAuthRows } from '../modules/identity'
import { sourceSettingChanges, sourceSettings, users } from '../platform/db/schema'
import { buildTestApp, signUpForTest } from './app'
import { DAY, openTestDatabase, testClock, truncateAll } from './database'
import { body, putSources } from './admin-sources.support'

const handle = openTestDatabase()
const { db } = handle

let app: FastifyInstance
let admin: string

beforeEach(async () => {
  await truncateAll(db)
  app = buildTestApp({ database: db, clock: testClock().now })
  admin = await signUpForTest(app, db, 'admin@exemplo.com', 'senha-boa-123', { isAdmin: true })
})
afterEach(() => app.close())
afterAll(() => handle.close())

describe('registro de alterações', () => {
  it('grava antes, depois e o autor de cada salvamento que muda algo', async () => {
    await putSources(app, body({ clube: false }), admin)
    const [adminRow] = await db.select().from(users).where(eq(users.email, 'admin@exemplo.com'))
    const rows = await db.select().from(sourceSettingChanges)
    expect(rows).toHaveLength(1)
    expect(rows[0]?.userId).toBe(adminRow?.userId)
    expect(rows[0]?.before.every((row) => row.visible)).toBe(true)
    expect(rows[0]?.after.find((row) => row.sourceId === 'clube')?.visible).toBe(false)
  })

  it('apagar a conta do autor deixa user_id nulo e mantém a linha', async () => {
    await putSources(app, body({ clube: false }), admin)
    await db.delete(users).where(eq(users.email, 'admin@exemplo.com'))
    const rows = await db.select().from(sourceSettingChanges)
    expect(rows).toHaveLength(1)
    expect(rows[0]?.userId).toBeNull()
  })

  it('a limpeza do cron não apaga configuração nem registro', async () => {
    await putSources(app, body({ clube: false }), admin)
    await deleteExpiredAuthRows(db, new Date(Date.now() + 400 * DAY))
    const settings = await db.execute<{ total: number }>(
      sql`SELECT count(*)::int AS total FROM ${sourceSettings}`,
    )
    expect(settings[0]?.total).toBe(4)
    expect(await db.select().from(sourceSettingChanges)).toHaveLength(1)
  })
})
