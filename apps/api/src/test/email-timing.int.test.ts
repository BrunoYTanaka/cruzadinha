import type { FastifyInstance } from 'fastify'
import { afterAll, afterEach, beforeEach, describe, expect, it } from 'vitest'
import { buildTestApp, signUpForTest } from './app'
import { openTestDatabase, testClock, truncateAll } from './database'
import { fakeEmailSender, type FakeEmailSender } from './fake-email'

const handle = openTestDatabase()
const { db } = handle

const PASSWORD = 'senha-boa-123'
const SEND_DELAY_MS = 1500
const RUNS = 5

let app: FastifyInstance
let mail: FakeEmailSender

beforeEach(async () => {
  await truncateAll(db)
  mail = fakeEmailSender()
  mail.delayMs = SEND_DELAY_MS
  app = buildTestApp({ database: db, clock: testClock().now, emailSender: mail })
})
afterEach(() => app.close())
afterAll(() => handle.close())

async function elapsed(run: () => Promise<{ statusCode: number }>): Promise<number> {
  const start = performance.now()
  const response = await run()
  expect(response.statusCode).toBe(202)
  return performance.now() - start
}

const median = (values: number[]) =>
  [...values].sort((a, b) => a - b)[Math.floor(values.length / 2)] ?? 0

describe('o tempo da resposta não revela se a conta existe', () => {
  it('cadastro: e-mail novo e e-mail com conta, sem esperar o envio', async () => {
    await signUpForTest(app, db, 'ana@exemplo.com', PASSWORD)
    const fresh: number[] = []
    const existing: number[] = []
    for (let i = 0; i < RUNS; i++) {
      fresh.push(
        await elapsed(() =>
          app.inject({
            method: 'POST',
            url: '/api/auth/register',
            payload: { email: `nova${i}@exemplo.com` },
            remoteAddress: `10.0.1.${i}`,
          }),
        ),
      )
      existing.push(
        await elapsed(() =>
          app.inject({
            method: 'POST',
            url: '/api/auth/register',
            payload: { email: 'ana@exemplo.com' },
            remoteAddress: `10.0.2.${i}`,
          }),
        ),
      )
    }
    expect(Math.max(...fresh, ...existing)).toBeLessThan(SEND_DELAY_MS)
    expect(Math.abs(median(fresh) - median(existing))).toBeLessThan(250)
  })

  it('recuperação: conta existente e inexistente, sem esperar o envio', async () => {
    await signUpForTest(app, db, 'ana@exemplo.com', PASSWORD)
    const known: number[] = []
    const unknown: number[] = []
    for (let i = 0; i < RUNS; i++) {
      // endereços diferentes e um e-mail novo por rodada, para o intervalo não interferir
      await signUpForTest(app, db, `conta${i}@exemplo.com`, PASSWORD)
      known.push(
        await elapsed(() =>
          app.inject({
            method: 'POST',
            url: '/api/auth/forgot-password',
            payload: { email: `conta${i}@exemplo.com` },
            remoteAddress: `10.0.3.${i}`,
          }),
        ),
      )
      unknown.push(
        await elapsed(() =>
          app.inject({
            method: 'POST',
            url: '/api/auth/forgot-password',
            payload: { email: `ninguem${i}@exemplo.com` },
            remoteAddress: `10.0.4.${i}`,
          }),
        ),
      )
    }
    expect(Math.max(...known, ...unknown)).toBeLessThan(SEND_DELAY_MS)
    expect(Math.abs(median(known) - median(unknown))).toBeLessThan(250)
    await app.flushEmail()
  })
})
