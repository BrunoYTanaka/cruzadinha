import { sql } from 'drizzle-orm'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { runCli } from '../cli/run-cli'
import { buildTestApp, sessionCookieFrom, signUpForTest } from './app'
import { fakeSource } from './fake-source'
import { openTestDatabase, tableNames, testClock, truncateAll } from './database'

const handle = openTestDatabase()
const { db } = handle

beforeAll(() => truncateAll(db))
afterAll(() => handle.close())

// SC-006: como a suíte esvazia as tabelas entre os testes, a inspeção fica no fim de um
// teste único que passa por todos os fluxos que gravam segredos.
describe('stored secrets', () => {
  it('keeps no password or session value in plain text', async () => {
    const clock = testClock()
    const app = buildTestApp({ database: db, clock: clock.now })
    const secrets: string[] = []

    // Conta criada pelo autor na linha de comando (feature 013).
    const cliPassword = 'senha-do-autor-456'
    secrets.push(cliPassword)
    await runCli(['users', 'create', '--email', 'bia@exemplo.com'], {
      db,
      clock: clock.now,
      sources: [fakeSource()],
      historyDays: 0,
      readSecret: async () => cliPassword,
      stdout: () => {},
      stderr: () => {},
    })

    const password = 'senha-secreta-987'
    secrets.push(password)
    // O cadastro agora só grava a pendência; a conta vem do usuário criado direto no banco.
    const pending = await app.inject({
      method: 'POST',
      url: '/api/auth/register',
      payload: { email: 'pendente@exemplo.com' },
    })
    expect(pending.statusCode).toBe(202)
    await signUpForTest(app, db, 'ana@exemplo.com', password)

    const loggedIn = await app.inject({
      method: 'POST',
      url: '/api/auth/login',
      payload: { email: 'ana@exemplo.com', password },
    })
    const loginCookie = sessionCookieFrom(loggedIn.headers['set-cookie']) ?? ''
    secrets.push(loginCookie)
    await app.close()

    expect(secrets.every((secret) => secret.length > 0)).toBe(true)
    const needles = secrets

    for (const table of await tableNames(db)) {
      const columns = await db.execute<{ column_name: string }>(sql`
        SELECT column_name FROM information_schema.columns
        WHERE table_schema = 'public' AND table_name = ${table} AND data_type = 'text'`)
      for (const { column_name: column } of columns) {
        const rows = await db.execute<{ value: string | null }>(
          sql`SELECT ${sql.identifier(column)} AS value FROM ${sql.identifier(table)}`,
        )
        for (const { value } of rows) {
          for (const needle of needles) {
            expect(value ?? '', `${table}.${column}`).not.toContain(needle)
          }
        }
      }
    }
  })
})
