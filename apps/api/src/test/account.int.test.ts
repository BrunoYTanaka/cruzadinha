import type { FastifyInstance } from 'fastify'
import { eq } from 'drizzle-orm'
import { afterAll, afterEach, beforeEach, describe, expect, it } from 'vitest'
import {
  emailChangeRequests,
  passwordResetTokens,
  rateLimitAttempts,
  sessions,
  users,
} from '../platform/db/schema'
import { sha256Hex } from '../platform/lib/tokens'
import { buildTestApp, sessionCookieFrom, signUpForTest } from './app'
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
  build({ APP_BASE_URL: 'https://site.example', MAIL_FROM: 'a@site.example' })
})
afterEach(() => app.close())
afterAll(() => handle.close())

const post = (url: string, payload: object, sid?: string) =>
  app.inject({
    method: 'POST',
    url,
    payload,
    ...(sid ? { headers: { cookie: `sid=${sid}` } } : {}),
  })

const login = (email: string, password: string) => post('/api/auth/login', { email, password })

const me = (sid: string) =>
  app.inject({ method: 'GET', url: '/api/auth/me', headers: { cookie: `sid=${sid}` } })

const changePassword = (sid: string, currentPassword: string, newPassword = NEW_PASSWORD) =>
  post('/api/auth/change-password', { currentPassword, newPassword }, sid)

const changeEmail = (sid: string, newEmail: string, currentPassword = PASSWORD) =>
  post('/api/auth/change-email', { currentPassword, newEmail }, sid)

async function second(email: string, password = PASSWORD): Promise<string> {
  return sessionCookieFrom((await login(email, password)).headers['set-cookie']) ?? ''
}

describe('POST /api/auth/change-password', () => {
  it('troca a senha, encerra as outras sessões e mantém a atual', async () => {
    const sid = await signUpForTest(app, db, 'ana@exemplo.com', PASSWORD)
    const other = await second('ana@exemplo.com')

    const response = await changePassword(sid, PASSWORD)

    expect(response.statusCode).toBe(200)
    expect((await me(sid)).statusCode).toBe(200)
    expect((await me(other)).statusCode).toBe(401)
    expect((await login('ana@exemplo.com', PASSWORD)).statusCode).toBe(401)
    expect((await login('ana@exemplo.com', NEW_PASSWORD)).statusCode).toBe(200)
  })

  it('senha atual errada é 400 wrong-password, nunca 401, e não muda nada', async () => {
    const sid = await signUpForTest(app, db, 'ana@exemplo.com', PASSWORD)
    const response = await changePassword(sid, 'errada-errada')
    expect(response.statusCode).toBe(400)
    expect(response.json().error).toBe('wrong-password')
    expect((await login('ana@exemplo.com', PASSWORD)).statusCode).toBe(200)
  })

  it('repetir com a senha antiga depois da troca dá wrong-password', async () => {
    const sid = await signUpForTest(app, db, 'ana@exemplo.com', PASSWORD)
    await changePassword(sid, PASSWORD)
    expect((await changePassword(sid, PASSWORD)).json().error).toBe('wrong-password')
  })

  it('nova senha fora das regras é invalid-input em newPassword', async () => {
    const sid = await signUpForTest(app, db, 'ana@exemplo.com', PASSWORD)
    const response = await changePassword(sid, PASSWORD, 'curta')
    expect(response.statusCode).toBe(400)
    expect(response.json()).toMatchObject({ error: 'invalid-input', fields: ['newPassword'] })
  })

  it('a 6ª tentativa errada é 429 com Retry-After', async () => {
    const sid = await signUpForTest(app, db, 'ana@exemplo.com', PASSWORD)
    for (let i = 0; i < 5; i++) await changePassword(sid, 'errada-errada')
    const response = await changePassword(sid, PASSWORD)
    expect(response.statusCode).toBe(429)
    expect(response.headers['retry-after']).toBeDefined()
  })

  it('exige sessão', async () => {
    expect((await changePassword('', PASSWORD)).statusCode).toBe(401)
  })

  it('revoga o link de recuperação aberto e deixa o pedido de troca de e-mail', async () => {
    const sid = await signUpForTest(app, db, 'ana@exemplo.com', PASSWORD)
    await post('/api/auth/forgot-password', { email: 'ana@exemplo.com' })
    await app.flushEmail()
    clock.advance(2 * MINUTE)
    await changeEmail(sid, 'nova@exemplo.com')
    await app.flushEmail()
    const link = tokenFrom(mail.sent.find((message) => message.to === 'ana@exemplo.com'))

    await changePassword(sid, PASSWORD)

    expect(
      (await post('/api/auth/reset-password', { token: link, password: 'qualquer-coisa-1' })).json()
        .error,
    ).toBe('invalid-token')
    expect(await db.select().from(emailChangeRequests)).toHaveLength(1)
  })
})

describe('POST /api/auth/logout-others', () => {
  it('encerra as outras sessões, mantém a atual e é idempotente', async () => {
    const sid = await signUpForTest(app, db, 'ana@exemplo.com', PASSWORD)
    const other = await second('ana@exemplo.com')

    expect((await post('/api/auth/logout-others', {}, sid)).statusCode).toBe(200)
    expect((await post('/api/auth/logout-others', {}, sid)).statusCode).toBe(200)

    expect((await me(sid)).statusCode).toBe(200)
    expect((await me(other)).statusCode).toBe(401)
  })

  it('exige sessão e recusa corpo diferente de {}', async () => {
    const sid = await signUpForTest(app, db, 'ana@exemplo.com', PASSWORD)
    expect((await post('/api/auth/logout-others', {})).statusCode).toBe(401)
    expect((await post('/api/auth/logout-others', { x: 1 }, sid)).statusCode).toBe(400)
  })
})

describe('troca de e-mail', () => {
  it('só muda quando o link é aberto e avisa o endereço antigo sem citar o novo', async () => {
    const sid = await signUpForTest(app, db, 'ana@exemplo.com', PASSWORD)

    const response = await changeEmail(sid, 'nova@exemplo.com')
    await app.flushEmail()

    expect(response.statusCode).toBe(202)
    expect(response.json()).toEqual({ retryAfter: 60 })
    expect((await login('ana@exemplo.com', PASSWORD)).statusCode).toBe(200)
    const link = mail.sent.find((message) => message.to === 'nova@exemplo.com')
    const notice = mail.sent.find((message) => message.to === 'ana@exemplo.com')
    expect(notice?.text).not.toContain('nova@exemplo.com')

    const confirm = await post('/api/auth/confirm-email-change', { token: tokenFrom(link) })
    expect(confirm.statusCode).toBe(200)
    expect((await login('ana@exemplo.com', PASSWORD)).statusCode).toBe(401)
    expect((await login('nova@exemplo.com', PASSWORD)).statusCode).toBe(200)
    expect((await me(sid)).json().user.email).toBe('nova@exemplo.com')
    expect(await db.select().from(emailChangeRequests)).toHaveLength(0)
  })

  it('o link é de uso único e só vale o do último pedido', async () => {
    const sid = await signUpForTest(app, db, 'ana@exemplo.com', PASSWORD)
    await changeEmail(sid, 'nova@exemplo.com')
    clock.advance(2 * MINUTE)
    await changeEmail(sid, 'outra@exemplo.com')
    await app.flushEmail()
    const first = tokenFrom(mail.sent.find((message) => message.to === 'nova@exemplo.com'))
    const last = tokenFrom(mail.sent.find((message) => message.to === 'outra@exemplo.com'))

    expect((await post('/api/auth/confirm-email-change', { token: first })).json().error).toBe(
      'invalid-token',
    )
    expect((await post('/api/auth/confirm-email-change', { token: last })).statusCode).toBe(200)
    expect((await post('/api/auth/confirm-email-change', { token: last })).json().error).toBe(
      'invalid-token',
    )
  })

  it('endereço de outra conta: resposta igual, sem link, e o pedido anterior da conta morre', async () => {
    const sid = await signUpForTest(app, db, 'ana@exemplo.com', PASSWORD)
    await signUpForTest(app, db, 'bia@exemplo.com', PASSWORD)
    const free = await changeEmail(sid, 'nova@exemplo.com')
    await app.flushEmail()
    const staleLink = tokenFrom(mail.sent.find((message) => message.to === 'nova@exemplo.com'))
    mail.sent.length = 0
    clock.advance(2 * MINUTE)

    const taken = await changeEmail(sid, 'bia@exemplo.com')
    await app.flushEmail()

    expect(taken.statusCode).toBe(202)
    expect(taken.json()).toEqual(free.json())
    expect(mail.sent.map((message) => message.to)).toEqual(['ana@exemplo.com'])
    expect(await db.select().from(emailChangeRequests)).toHaveLength(0)
    expect((await post('/api/auth/confirm-email-change', { token: staleLink })).json().error).toBe(
      'invalid-token',
    )
  })

  it('dentro do intervalo não muda nada e o link anterior continua valendo', async () => {
    const sid = await signUpForTest(app, db, 'ana@exemplo.com', PASSWORD)
    await changeEmail(sid, 'nova@exemplo.com')
    await app.flushEmail()
    const link = tokenFrom(mail.sent.find((message) => message.to === 'nova@exemplo.com'))

    clock.advance(20_000)
    const early = await changeEmail(sid, 'outra@exemplo.com')
    await app.flushEmail()

    expect(early.statusCode).toBe(202)
    expect(early.json().retryAfter).toBeLessThan(60)
    expect(mail.sent).toHaveLength(2)
    expect((await post('/api/auth/confirm-email-change', { token: link })).statusCode).toBe(200)
  })

  it('o mesmo e-mail da conta é invalid-input em newEmail', async () => {
    const sid = await signUpForTest(app, db, 'ana@exemplo.com', PASSWORD)
    const response = await changeEmail(sid, 'Ana@Exemplo.com')
    expect(response.statusCode).toBe(400)
    expect(response.json()).toMatchObject({ error: 'invalid-input', fields: ['newEmail'] })
  })

  it('senha errada não envia nada', async () => {
    const sid = await signUpForTest(app, db, 'ana@exemplo.com', PASSWORD)
    const response = await changeEmail(sid, 'nova@exemplo.com', 'errada-errada')
    await app.flushEmail()
    expect(response.json().error).toBe('wrong-password')
    expect(mail.sent).toHaveLength(0)
  })

  it('link vencido (60 min) e endereço ocupado depois do pedido dão invalid-token', async () => {
    const sid = await signUpForTest(app, db, 'ana@exemplo.com', PASSWORD)
    await changeEmail(sid, 'nova@exemplo.com')
    await app.flushEmail()
    const link = tokenFrom(mail.sent.find((message) => message.to === 'nova@exemplo.com'))

    clock.advance(61 * MINUTE)
    // o vencimento é decidido pelo relógio injetado
    expect((await post('/api/auth/confirm-email-change', { token: link })).json().error).toBe(
      'invalid-token',
    )

    clock.advance(2 * MINUTE)
    await changeEmail(sid, 'ocupado@exemplo.com')
    await app.flushEmail()
    const taken = tokenFrom(mail.sent.findLast((message) => message.to === 'ocupado@exemplo.com'))
    await signUpForTest(app, db, 'ocupado@exemplo.com', PASSWORD)
    expect((await post('/api/auth/confirm-email-change', { token: taken })).json().error).toBe(
      'invalid-token',
    )
    expect((await me(sid)).json().user.email).toBe('ana@exemplo.com')
    expect(await db.select().from(emailChangeRequests)).toHaveLength(0)
  })

  it('confirmar revoga o link de recuperação aberto', async () => {
    const sid = await signUpForTest(app, db, 'ana@exemplo.com', PASSWORD)
    await post('/api/auth/forgot-password', { email: 'ana@exemplo.com' })
    await app.flushEmail()
    const reset = tokenFrom(mail.sent[0])
    clock.advance(2 * MINUTE)
    await changeEmail(sid, 'nova@exemplo.com')
    await app.flushEmail()
    const link = tokenFrom(mail.sent.find((message) => message.to === 'nova@exemplo.com'))

    await post('/api/auth/confirm-email-change', { token: link })

    const [row] = await db
      .select()
      .from(passwordResetTokens)
      .where(eq(passwordResetTokens.tokenHash, sha256Hex(reset)))
    expect(row?.usedAt).not.toBeNull()
  })

  it('confirmar não precisa de sessão nem do cadastro aberto', async () => {
    await app.close()
    build({ REGISTRATION_ENABLED: 'false', APP_BASE_URL: 'https://site.example' })
    const sid = await signUpForTest(app, db, 'ana@exemplo.com', PASSWORD)
    await changeEmail(sid, 'nova@exemplo.com')
    await app.flushEmail()
    const link = tokenFrom(mail.sent.find((message) => message.to === 'nova@exemplo.com'))
    expect((await post('/api/auth/confirm-email-change', { token: link })).statusCode).toBe(200)
  })

  it('exige sessão para pedir a troca', async () => {
    expect((await changeEmail('', 'nova@exemplo.com')).statusCode).toBe(401)
  })
})

describe('POST /api/auth/delete-account', () => {
  it('apaga a conta e tudo o que é dela, limpa o cookie e libera o e-mail', async () => {
    const sid = await signUpForTest(app, db, 'ana@exemplo.com', PASSWORD)
    await second('ana@exemplo.com')
    await changeEmail(sid, 'nova@exemplo.com')
    await changePassword(sid, 'errada-errada')

    const response = await post('/api/auth/delete-account', { currentPassword: PASSWORD }, sid)

    expect(response.statusCode).toBe(200)
    expect(response.headers['set-cookie']).toContain('sid=;')
    expect(await db.select().from(users)).toHaveLength(0)
    expect(await db.select().from(sessions)).toHaveLength(0)
    expect(await db.select().from(emailChangeRequests)).toHaveLength(0)
    expect(
      (await db.select().from(rateLimitAttempts)).filter((row) => row.keyType === 'USER'),
    ).toHaveLength(0)
    expect(
      (await post('/api/auth/delete-account', { currentPassword: PASSWORD }, sid)).statusCode,
    ).toBe(401)
    expect((await login('ana@exemplo.com', PASSWORD)).statusCode).toBe(401)
    await signUpForTest(app, db, 'ana@exemplo.com', PASSWORD)
  })

  it('senha errada não apaga nada', async () => {
    const sid = await signUpForTest(app, db, 'ana@exemplo.com', PASSWORD)
    const response = await post(
      '/api/auth/delete-account',
      { currentPassword: 'errada-errada' },
      sid,
    )
    expect(response.json().error).toBe('wrong-password')
    expect(await db.select().from(users)).toHaveLength(1)
  })

  it('exige sessão', async () => {
    expect((await post('/api/auth/delete-account', { currentPassword: PASSWORD })).statusCode).toBe(
      401,
    )
  })
})
