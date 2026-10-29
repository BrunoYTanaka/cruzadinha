import type { FastifyInstance } from 'fastify'
import { afterAll, afterEach, beforeEach, describe, expect, it } from 'vitest'
import { emailSendBlock, pendingRegistrations } from '../platform/db/schema'
import { buildTestApp, signUpForTest } from './app'
import { MINUTE, openTestDatabase, testClock, truncateAll, type TestClock } from './database'
import { fakeEmailSender, type FakeEmailSender } from './fake-email'

const handle = openTestDatabase()
const { db } = handle

const PASSWORD = 'senha-boa-123'

let clock: TestClock
let app: FastifyInstance
let mail: FakeEmailSender

function build(env: Record<string, string> = {}) {
  app = buildTestApp({ database: db, clock: clock.now, emailSender: mail, env })
}

beforeEach(async () => {
  await truncateAll(db)
  // Meio do dia UTC: a trava diária dura até a meia-noite seguinte.
  clock = testClock()
  clock.set(new Date('2026-10-26T12:00:00Z'))
  mail = fakeEmailSender()
  build()
})
afterEach(() => app.close())
afterAll(() => handle.close())

const register = (email: string) =>
  app.inject({ method: 'POST', url: '/api/auth/register', payload: { email } })
const resend = (email: string) =>
  app.inject({ method: 'POST', url: '/api/auth/resend-verification', payload: { email } })
const forgot = (email: string) =>
  app.inject({ method: 'POST', url: '/api/auth/forgot-password', payload: { email } })

describe('trava de envio por cota do provedor', () => {
  it('a cota diária grava a trava até a meia-noite UTC e as rotas seguintes recusam', async () => {
    mail.outcomes = [{ ok: false, reason: 'quota-daily' }]
    const first = await register('ana@exemplo.com')
    expect(first.statusCode).toBe(202)
    await app.flushEmail()

    const [block] = await db.select().from(emailSendBlock)
    expect(block?.reason).toBe('daily_quota_exceeded')
    expect(block?.blockedUntil.toISOString()).toBe('2026-10-27T00:00:00.000Z')

    for (const response of [
      await register('bia@exemplo.com'),
      await resend('ana@exemplo.com'),
      await forgot('ana@exemplo.com'),
    ]) {
      expect(response.statusCode).toBe(503)
      expect(response.json()).toMatchObject({ error: 'email-unavailable', retryAfter: 12 * 3600 })
      expect(response.headers['retry-after']).toBe(String(12 * 3600))
    }
    await app.flushEmail()
    expect(mail.sent).toHaveLength(1)
  })

  it('a cota mensal trava até o início do mês seguinte', async () => {
    mail.outcomes = [{ ok: false, reason: 'quota-monthly' }]
    await register('ana@exemplo.com')
    await app.flushEmail()
    const [block] = await db.select().from(emailSendBlock)
    expect(block?.reason).toBe('monthly_quota_exceeded')
    expect(block?.blockedUntil.toISOString()).toBe('2026-11-01T00:00:00.000Z')
  })

  it('rate_limit_exceeded e falhas comuns não travam', async () => {
    mail.outcomes = [
      { ok: false, reason: 'rate-limited' },
      { ok: false, reason: 'failed' },
    ]
    await register('ana@exemplo.com')
    await app.flushEmail()
    clock.advance(61_000)
    await register('bia@exemplo.com')
    await app.flushEmail()

    expect(await db.select().from(emailSendBlock)).toHaveLength(0)
    expect((await register('cris@exemplo.com')).statusCode).toBe(202)
  })

  it('a trava vencida é ignorada', async () => {
    mail.outcomes = [{ ok: false, reason: 'quota-daily' }]
    await register('ana@exemplo.com')
    await app.flushEmail()
    clock.set(new Date('2026-10-27T00:00:01Z'))
    expect((await register('bia@exemplo.com')).statusCode).toBe(202)
  })

  it('a pendência continua durante a trava e o reenvio funciona depois dela', async () => {
    await register('ana@exemplo.com')
    await app.flushEmail()
    mail.outcomes = [{ ok: false, reason: 'quota-daily' }]
    clock.advance(61_000)
    await resend('ana@exemplo.com')
    await app.flushEmail()

    expect(await db.select().from(pendingRegistrations)).toHaveLength(1)
    expect((await resend('ana@exemplo.com')).statusCode).toBe(503)

    clock.set(new Date('2026-10-27T00:01:00Z'))
    const after = await resend('ana@exemplo.com')
    expect(after.statusCode).toBe(202)
    await app.flushEmail()
    expect(mail.sent.length).toBeGreaterThanOrEqual(2)
  })

  it('o cadastro fechado continua recusando antes da trava', async () => {
    mail.outcomes = [{ ok: false, reason: 'quota-daily' }]
    await register('ana@exemplo.com')
    await app.flushEmail()
    await app.close()
    build({ REGISTRATION_ENABLED: 'false' })
    expect((await register('bia@exemplo.com')).statusCode).toBe(403)
    expect((await resend('bia@exemplo.com')).statusCode).toBe(403)
  })

  it('sem remetente configurado em produção, responde email-unavailable', async () => {
    await app.close()
    app = buildTestApp({
      database: db,
      clock: clock.now,
      env: {
        NODE_ENV: 'production',
        APP_BASE_URL: 'https://cruzadinha.example.com',
        CAPTCHA_ENABLED: 'false',
      },
    })
    const response = await register('ana@exemplo.com')
    expect(response.statusCode).toBe(503)
    expect(response.json().error).toBe('email-unavailable')
    expect(await db.select().from(pendingRegistrations)).toHaveLength(0)
  })

  it('a recuperação também fica indisponível, sem afetar o login', async () => {
    await signUpForTest(app, db, 'ana@exemplo.com', PASSWORD)
    mail.outcomes = [{ ok: false, reason: 'quota-daily' }]
    await forgot('ana@exemplo.com')
    await app.flushEmail()
    clock.advance(MINUTE)
    expect((await forgot('ana@exemplo.com')).statusCode).toBe(503)
    const login = await app.inject({
      method: 'POST',
      url: '/api/auth/login',
      payload: { email: 'ana@exemplo.com', password: PASSWORD },
    })
    expect(login.statusCode).toBe(200)
  })
})
