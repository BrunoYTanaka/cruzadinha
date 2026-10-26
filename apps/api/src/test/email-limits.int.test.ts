import type { FastifyInstance } from 'fastify'
import { afterAll, afterEach, beforeEach, describe, expect, it } from 'vitest'
import { pendingRegistrations, users } from '../platform/db/schema'
import { buildTestApp, signUpForTest } from './app'
import { openTestDatabase, testClock, truncateAll, type TestClock } from './database'
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
  clock = testClock()
  mail = fakeEmailSender()
  build()
})
afterEach(() => app.close())
afterAll(() => handle.close())

const register = (email: string, remoteAddress?: string) =>
  app.inject({
    method: 'POST',
    url: '/api/auth/register',
    payload: { email },
    remoteAddress,
  })
const resend = (email: string, remoteAddress?: string) =>
  app.inject({
    method: 'POST',
    url: '/api/auth/resend-verification',
    payload: { email },
    remoteAddress,
  })
const forgot = (email: string, remoteAddress?: string) =>
  app.inject({
    method: 'POST',
    url: '/api/auth/forgot-password',
    payload: { email },
    remoteAddress,
  })
const verify = (token: string, remoteAddress?: string) =>
  app.inject({
    method: 'POST',
    url: '/api/auth/verify-email',
    payload: { token, password: PASSWORD },
    remoteAddress,
  })

describe('limite por endereço', () => {
  it.each([
    ['reenvio', (address: string) => resend('ana@exemplo.com', address)],
    ['recuperação', (address: string) => forgot('ana@exemplo.com', address)],
    ['confirmação', (address: string) => verify('A'.repeat(43), address)],
  ] as const)('%s recusa com 429, retryAfter no corpo e no cabeçalho', async (name, call) => {
    // 30 por hora na confirmação; 10 nas outras.
    const allowed = name === 'confirmação' ? 30 : 10
    await app.close()
    build({ REGISTRATION_ENABLED: 'true' })
    for (let i = 0; i < allowed; i++) {
      expect((await call('10.0.0.1')).statusCode).not.toBe(429)
    }
    const blocked = await call('10.0.0.1')
    expect(blocked.statusCode).toBe(429)
    expect(blocked.json().retryAfter).toBe(Number(blocked.headers['retry-after']))
    expect(blocked.json().retryAfter).toBeGreaterThan(0)

    expect((await call('10.0.0.2')).statusCode).not.toBe(429)
  })
})

describe('limite por e-mail por dia', () => {
  it('deixa de enviar depois do máximo, mas responde igual', async () => {
    await app.close()
    build({ EMAIL_PER_ADDRESS_DAILY_MAX: '2' })

    const statuses: number[] = []
    for (let i = 0; i < 4; i++) {
      statuses.push((await register('ana@exemplo.com')).statusCode)
      await app.flushEmail()
      clock.advance(61_000)
    }
    expect(statuses).toEqual([202, 202, 202, 202])
    expect(mail.sent).toHaveLength(2)
  })
})

describe('teto global diário com reserva para a recuperação', () => {
  it('o cadastro para antes do teto e a recuperação ainda usa as últimas vagas', async () => {
    await app.close()
    // teto 3, reserva 1: cadastro e aviso enviam 2; a recuperação, até 3.
    build({ EMAIL_DAILY_CEILING: '3', EMAIL_RECOVERY_RESERVE: '1' })
    await signUpForTest(app, db, 'conta1@exemplo.com', PASSWORD)
    await signUpForTest(app, db, 'conta2@exemplo.com', PASSWORD)

    for (const email of ['a@exemplo.com', 'b@exemplo.com', 'c@exemplo.com']) {
      expect((await register(email)).statusCode).toBe(202)
      await app.flushEmail()
    }
    expect(mail.sent).toHaveLength(2)

    expect((await forgot('conta1@exemplo.com')).statusCode).toBe(202)
    await app.flushEmail()
    expect(mail.sent).toHaveLength(3)
    expect(mail.sent[2]?.to).toBe('conta1@exemplo.com')

    // teto cheio: nem a recuperação envia mais, e a resposta continua igual
    expect((await forgot('conta2@exemplo.com')).statusCode).toBe(202)
    await app.flushEmail()
    expect(mail.sent).toHaveLength(3)
  })

  it('volta a enviar quando as vagas saem da janela de 24 horas', async () => {
    await app.close()
    build({ EMAIL_DAILY_CEILING: '2', EMAIL_RECOVERY_RESERVE: '0' })
    await register('a@exemplo.com')
    await register('b@exemplo.com')
    await app.flushEmail()
    await register('c@exemplo.com')
    await app.flushEmail()
    expect(mail.sent).toHaveLength(2)

    clock.advance(24 * 60 * 60 * 1000 + 1000)
    await register('d@exemplo.com')
    await app.flushEmail()
    expect(mail.sent).toHaveLength(3)
  })
})

describe('cadastro de um e-mail que já tem conta', () => {
  it('responde igual a um cadastro novo, não cria pendência e avisa o dono uma vez', async () => {
    await signUpForTest(app, db, 'ana@exemplo.com', PASSWORD)

    const fresh = await register('nova@exemplo.com')
    const existing = await register('ana@exemplo.com')
    expect(existing.statusCode).toBe(fresh.statusCode)
    expect(existing.json()).toEqual(fresh.json())

    await app.flushEmail()
    expect(await db.select().from(pendingRegistrations)).toHaveLength(1)
    expect(await db.select().from(users)).toHaveLength(1)
    const toOwner = mail.sent.filter((message) => message.to === 'ana@exemplo.com')
    expect(toOwner).toHaveLength(1)
    expect(toOwner[0]?.text).not.toContain('#token=')

    // dentro do intervalo, outro pedido não manda outro aviso e devolve o tempo restante
    clock.advance(10_000)
    const again = await register('ana@exemplo.com')
    // o limitador conta pelo relógio do banco, então o resto do intervalo varia em 1 s
    expect(again.json().retryAfter).toBeGreaterThanOrEqual(49)
    expect(again.json().retryAfter).toBeLessThanOrEqual(51)
    await app.flushEmail()
    expect(mail.sent.filter((message) => message.to === 'ana@exemplo.com')).toHaveLength(1)
  })
})
