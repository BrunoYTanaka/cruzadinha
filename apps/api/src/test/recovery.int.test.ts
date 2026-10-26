import type { FastifyInstance } from 'fastify'
import { afterAll, afterEach, beforeEach, describe, expect, it } from 'vitest'
import { passwordResetTokens, sessions, users } from '../db/schema'
import { sha256Hex } from '../lib/tokens'
import { buildTestApp, signUpForTest } from './app'
import { MINUTE, openTestDatabase, testClock, truncateAll, type TestClock } from './database'
import { fakeEmailSender, tokenFrom, type FakeEmailSender } from './fake-email'

const handle = openTestDatabase()
const { db } = handle

const PASSWORD = 'senha-boa-123'
const NEW_PASSWORD = 'senha-nova-456'

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

const forgot = (email: string) =>
  app.inject({ method: 'POST', url: '/api/auth/forgot-password', payload: { email } })

const reset = (token: string, password: string) =>
  app.inject({ method: 'POST', url: '/api/auth/reset-password', payload: { token, password } })

const login = (email: string, password: string) =>
  app.inject({ method: 'POST', url: '/api/auth/login', payload: { email, password } })

const me = (sid: string) =>
  app.inject({ method: 'GET', url: '/api/auth/me', headers: { cookie: `sid=${sid}` } })

describe('POST /api/auth/forgot-password', () => {
  it('manda o link para uma conta existente e responde igual para uma inexistente', async () => {
    await signUpForTest(app, db, 'ana@exemplo.com', PASSWORD)

    const known = await forgot('ana@exemplo.com')
    const unknown = await forgot('ninguem@exemplo.com')

    expect(known.statusCode).toBe(202)
    expect(unknown.statusCode).toBe(202)
    expect(unknown.json()).toEqual(known.json())
    expect(known.json()).toEqual({ retryAfter: 60 })

    await app.flushEmail()
    expect(mail.sent).toHaveLength(1)
    expect(mail.sent[0]?.to).toBe('ana@exemplo.com')
    const [stored] = await db.select().from(passwordResetTokens)
    expect(stored?.tokenHash).toBe(sha256Hex(tokenFrom(mail.sent[0])))
  })

  it('funciona com o cadastro fechado', async () => {
    await app.close()
    build({ REGISTRATION_ENABLED: 'false' })
    await signUpForTest(app, db, 'ana@exemplo.com', PASSWORD)
    expect((await forgot('ana@exemplo.com')).statusCode).toBe(202)
    await app.flushEmail()
    expect(mail.sent).toHaveLength(1)
  })

  it('um pedido novo invalida o link anterior', async () => {
    await signUpForTest(app, db, 'ana@exemplo.com', PASSWORD)
    await forgot('ana@exemplo.com')
    await app.flushEmail()
    clock.advance(61_000)
    await forgot('ana@exemplo.com')
    await app.flushEmail()

    const [first, second] = mail.sent.map(tokenFrom)
    expect((await reset(first ?? '', NEW_PASSWORD)).json().error).toBe('invalid-token')
    expect((await reset(second ?? '', NEW_PASSWORD)).statusCode).toBe(200)
  })

  it('dentro do intervalo não envia outro e devolve o tempo restante', async () => {
    await signUpForTest(app, db, 'ana@exemplo.com', PASSWORD)
    await forgot('ana@exemplo.com')
    await app.flushEmail()
    clock.advance(25_000)
    const early = await forgot('ana@exemplo.com')
    // o limitador conta pelo relógio do banco, então o resto do intervalo varia em 1 s
    expect(early.json().retryAfter).toBeGreaterThanOrEqual(34)
    expect(early.json().retryAfter).toBeLessThanOrEqual(36)
    await app.flushEmail()
    expect(mail.sent).toHaveLength(1)
  })

  it('o tempo restante de um pedido repetido é igual com e sem conta', async () => {
    await signUpForTest(app, db, 'ana@exemplo.com', PASSWORD)
    await forgot('ana@exemplo.com')
    await forgot('ninguem@exemplo.com')
    clock.advance(20_000)

    const known = (await forgot('ana@exemplo.com')).json().retryAfter
    const unknown = (await forgot('ninguem@exemplo.com')).json().retryAfter
    expect(Math.abs(known - unknown)).toBeLessThanOrEqual(1)
    expect(known).toBeLessThan(60)
  })

  it('dois pedidos juntos deixam um único token aberto e mandam um único e-mail', async () => {
    await signUpForTest(app, db, 'ana@exemplo.com', PASSWORD)
    await Promise.all([forgot('ana@exemplo.com'), forgot('ana@exemplo.com')])
    await app.flushEmail()
    const open = (await db.select().from(passwordResetTokens)).filter((row) => !row.usedAt)
    expect(open).toHaveLength(1)
    expect(mail.sent).toHaveLength(1)
  })

  it('se o envio falha, o pedido seguinte não espera o intervalo', async () => {
    await signUpForTest(app, db, 'ana@exemplo.com', PASSWORD)
    mail.outcomes = [{ ok: false, reason: 'failed' }]
    await forgot('ana@exemplo.com')
    await app.flushEmail()
    expect((await forgot('ana@exemplo.com')).json()).toEqual({ retryAfter: 60 })
    await app.flushEmail()
    expect(mail.sent).toHaveLength(2)
  })

  it('recusa um e-mail inválido', async () => {
    const response = await forgot('nao-e-email')
    expect(response.statusCode).toBe(400)
    expect(response.json().fields).toEqual(['email'])
  })
})

describe('POST /api/auth/reset-password', () => {
  async function requestLink(email = 'ana@exemplo.com'): Promise<string> {
    await forgot(email)
    await app.flushEmail()
    return tokenFrom(mail.sent.at(-1))
  }

  it('troca a senha, usa o token e encerra todas as sessões da conta', async () => {
    const other = await signUpForTest(app, db, 'bia@exemplo.com', PASSWORD)
    const first = await signUpForTest(app, db, 'ana@exemplo.com', PASSWORD)
    const second = await signUpForTest(app, db, 'ana@exemplo.com', PASSWORD)
    const token = await requestLink()

    const response = await reset(token, NEW_PASSWORD)
    expect(response.statusCode).toBe(200)
    expect(response.json()).toEqual({})
    expect(String(response.headers['set-cookie'])).toMatch(/^sid=;/)

    expect((await login('ana@exemplo.com', PASSWORD)).statusCode).toBe(401)
    expect((await login('ana@exemplo.com', NEW_PASSWORD)).statusCode).toBe(200)
    expect((await me(first)).statusCode).toBe(401)
    expect((await me(second)).statusCode).toBe(401)
    expect((await me(other)).statusCode).toBe(200)

    const [user] = await db.select().from(users)
    expect(user?.passwordHash.startsWith('$argon2id$')).toBe(true)
    expect((await db.select().from(sessions)).filter((row) => !row.endedAt).length).toBeGreaterThan(
      0,
    )
  })

  it('o link funciona uma vez só e vence em 1 hora', async () => {
    await signUpForTest(app, db, 'ana@exemplo.com', PASSWORD)
    const token = await requestLink()
    expect((await reset(token, NEW_PASSWORD)).statusCode).toBe(200)
    expect((await reset(token, 'outra-senha-789')).json().error).toBe('invalid-token')

    const late = await requestLink()
    clock.advance(61 * MINUTE)
    expect((await reset(late, NEW_PASSWORD)).json().error).toBe('invalid-token')
  })

  it('a redefinição não depende do limite da confirmação de e-mail', async () => {
    await signUpForTest(app, db, 'ana@exemplo.com', PASSWORD)
    const token = await requestLink()
    for (let i = 0; i < 30; i++) {
      await app.inject({
        method: 'POST',
        url: '/api/auth/verify-email',
        payload: { token: 'A'.repeat(43), password: PASSWORD },
      })
    }
    expect((await reset(token, NEW_PASSWORD)).statusCode).toBe(200)
  })

  it('uma senha inválida não consome o link', async () => {
    await signUpForTest(app, db, 'ana@exemplo.com', PASSWORD)
    const token = await requestLink()

    const weak = await reset(token, '1234567')
    expect(weak.statusCode).toBe(400)
    expect(weak.json().error).toBe('invalid-input')
    expect(weak.json().fields).toEqual(['password'])
    expect((await reset(token, NEW_PASSWORD)).statusCode).toBe(200)
  })

  it('só um de dois pedidos simultâneos com o mesmo token vence', async () => {
    await signUpForTest(app, db, 'ana@exemplo.com', PASSWORD)
    const token = await requestLink()
    const responses = await Promise.all([
      reset(token, NEW_PASSWORD),
      reset(token, 'outra-senha-789'),
    ])
    expect(responses.map((response) => response.statusCode).sort()).toEqual([200, 400])
  })

  it('não abre sessão', async () => {
    await signUpForTest(app, db, 'ana@exemplo.com', PASSWORD)
    const token = await requestLink()
    const before = (await db.select().from(sessions)).length
    await reset(token, NEW_PASSWORD)
    expect((await db.select().from(sessions)).length).toBe(before)
  })
})
