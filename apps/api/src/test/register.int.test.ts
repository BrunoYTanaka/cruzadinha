import type { FastifyInstance } from 'fastify'
import { afterAll, afterEach, beforeEach, describe, expect, it } from 'vitest'
import { pendingRegistrations, rateLimitAttempts, sessions, users } from '../platform/db/schema'
import { sha256Hex } from '../platform/lib/tokens'
import { buildTestApp, signUpForTest } from './app'
import { MINUTE, openTestDatabase, testClock, truncateAll, type TestClock } from './database'
import { fakeEmailSender, tokenFrom, type FakeEmailSender } from './fake-email'

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

function register(body: Record<string, unknown>, options: { remoteAddress?: string } = {}) {
  return app.inject({
    method: 'POST',
    url: '/api/auth/register',
    payload: body,
    remoteAddress: options.remoteAddress,
  })
}

function verify(token: string, password: string = PASSWORD) {
  return app.inject({ method: 'POST', url: '/api/auth/verify-email', payload: { token, password } })
}

function login(email: string, password: string) {
  return app.inject({ method: 'POST', url: '/api/auth/login', payload: { email, password } })
}

function resend(email: string) {
  return app.inject({ method: 'POST', url: '/api/auth/resend-verification', payload: { email } })
}

// Mesma instância com o cadastro fechado (o padrão fora dos testes, feature 013).
async function closeRegistration() {
  await app.close()
  build({ REGISTRATION_ENABLED: 'false' })
}

describe('POST /api/auth/register com o cadastro fechado', () => {
  it('recusa com 403 registration-closed sem criar nada nem contar tentativa', async () => {
    await closeRegistration()
    const response = await register({ email: 'ana@exemplo.com' })

    expect(response.statusCode).toBe(403)
    expect(response.json()).toEqual({
      error: 'registration-closed',
      message: 'O cadastro está fechado no momento.',
    })
    expect(response.headers['set-cookie']).toBeUndefined()
    expect(await db.select().from(users)).toHaveLength(0)
    expect(await db.select().from(pendingRegistrations)).toHaveLength(0)
    expect(await db.select().from(rateLimitAttempts)).toHaveLength(0)
    await app.flushEmail()
    expect(mail.sent).toHaveLength(0)
  })

  it('recusa também um corpo inválido, sem dizer o motivo', async () => {
    await closeRegistration()
    const response = await register({ email: 'ana' })
    expect(response.statusCode).toBe(403)
    expect(response.json().error).toBe('registration-closed')
  })

  it('GET /api/auth/registration diz que está fechado', async () => {
    await closeRegistration()
    const response = await app.inject({ method: 'GET', url: '/api/auth/registration' })
    expect(response.json()).toEqual({ open: false })
    expect(response.headers['cache-control']).toBe('no-store')
  })

  it('o reenvio também é recusado antes de qualquer outra checagem', async () => {
    await closeRegistration()
    expect((await resend('ana')).statusCode).toBe(403)
  })
})

describe('POST /api/auth/register com o cadastro aberto', () => {
  it('grava só uma pendência, sem senha, não cria conta nem sessão e envia o link', async () => {
    const response = await register({ email: 'Ana@Exemplo.com ' })

    expect(response.statusCode).toBe(202)
    expect(response.json()).toEqual({ retryAfter: 60 })
    expect(response.headers['set-cookie']).toBeUndefined()
    expect(await db.select().from(users)).toHaveLength(0)
    expect(await db.select().from(sessions)).toHaveLength(0)

    const [pending] = await db.select().from(pendingRegistrations)
    expect(pending?.email).toBe('ana@exemplo.com')
    expect(Object.keys(pending ?? {})).not.toContain('passwordHash')

    await app.flushEmail()
    expect(mail.sent).toHaveLength(1)
    expect(mail.sent[0]?.to).toBe('ana@exemplo.com')
    const token = tokenFrom(mail.sent[0])
    expect(pending?.tokenHash).toBe(sha256Hex(token))
    expect(JSON.stringify(pending)).not.toContain(token)
  })

  it('recusa um cadastro que ainda envia o código de convite, que não existe mais', async () => {
    const response = await register({ email: 'ana@exemplo.com', inviteCode: 'ABCD-EFGH-JKMN-PQRS' })
    expect(response.statusCode).toBe(400)
    expect(await db.select().from(pendingRegistrations)).toHaveLength(0)
  })

  it('não aceita senha no cadastro: ela é escolhida na confirmação', async () => {
    const response = await register({ email: 'ana@exemplo.com', password: PASSWORD })
    expect(response.statusCode).toBe(400)
    expect(await db.select().from(pendingRegistrations)).toHaveLength(0)
  })

  it('aponta os campos inválidos e recusa campos desconhecidos', async () => {
    const response = await register({ email: 'ana' })
    expect(response.statusCode).toBe(400)
    expect(response.json()).toEqual({
      error: 'invalid-input',
      message: 'Dados inválidos.',
      fields: ['email'],
    })
    expect((await register({ email: 'a@x.com', papel: 'admin' })).statusCode).toBe(400)
  })

  it('o login falha enquanto o e-mail não foi confirmado', async () => {
    await register({ email: 'ana@exemplo.com' })
    const response = await login('ana@exemplo.com', PASSWORD)
    expect(response.statusCode).toBe(401)
    expect(response.json().error).toBe('invalid-credentials')
  })

  it('limita os cadastros por endereço de rede, com retryAfter no corpo e no cabeçalho', async () => {
    for (let i = 0; i < 10; i++) {
      const response = await register({ email: `x${i}` }, { remoteAddress: '10.0.0.1' })
      expect(response.statusCode).toBe(400)
    }

    const blocked = await register({ email: 'ana@x.com' }, { remoteAddress: '10.0.0.1' })
    expect(blocked.statusCode).toBe(429)
    const body = blocked.json()
    expect(body.error).toBe('too-many-attempts')
    expect(body.retryAfter).toBe(Number(blocked.headers['retry-after']))
    expect(body.retryAfter).toBeGreaterThan(0)

    clock.advance(61 * MINUTE)
    const later = await register({ email: 'ana@x.com' }, { remoteAddress: '10.0.0.1' })
    expect(later.statusCode).toBe(202)
  })

  it('GET /api/auth/registration diz que está aberto', async () => {
    const response = await app.inject({ method: 'GET', url: '/api/auth/registration' })
    expect(response.json()).toEqual({ open: true })
  })
})

describe('POST /api/auth/verify-email', () => {
  async function pendingToken(email = 'ana@exemplo.com'): Promise<string> {
    await register({ email })
    await app.flushEmail()
    return tokenFrom(mail.sent.at(-1))
  }

  it('cria a conta com a senha escolhida na confirmação e não abre sessão', async () => {
    const token = await pendingToken()
    const response = await verify(token, 'escolhida-aqui-1')

    expect(response.statusCode).toBe(200)
    expect(response.json()).toEqual({})
    expect(response.headers['set-cookie']).toBeUndefined()
    expect(await db.select().from(pendingRegistrations)).toHaveLength(0)
    expect(await db.select().from(sessions)).toHaveLength(0)

    const [user] = await db.select().from(users)
    expect(user?.email).toBe('ana@exemplo.com')
    expect(user?.passwordHash.startsWith('$argon2id$')).toBe(true)
    expect(user?.passwordHash).not.toContain('escolhida-aqui-1')
    expect((await login('ana@exemplo.com', 'escolhida-aqui-1')).statusCode).toBe(200)
  })

  it('quem cadastra o e-mail de outra pessoa não escolhe a senha da conta dela', async () => {
    // O atacante pede o cadastro da vítima, e a vítima também; só quem abre o link define a senha.
    await register({ email: 'vitima@exemplo.com' })
    clock.advance(61_000)
    await register({ email: 'vitima@exemplo.com' })
    await app.flushEmail()
    const victimLink = tokenFrom(mail.sent.at(-1))

    await verify(victimLink, 'senha-da-vitima-1')
    expect((await login('vitima@exemplo.com', 'senha-da-vitima-1')).statusCode).toBe(200)
    expect((await login('vitima@exemplo.com', PASSWORD)).statusCode).toBe(401)
  })

  it('o link funciona uma vez só', async () => {
    const token = await pendingToken()
    expect((await verify(token)).statusCode).toBe(200)
    const again = await verify(token)
    expect(again.statusCode).toBe(400)
    expect(again.json()).toEqual({ error: 'invalid-token', message: 'Link inválido ou vencido.' })
    expect(await db.select().from(users)).toHaveLength(1)
  })

  it('uma senha inválida não gasta o link', async () => {
    const token = await pendingToken()
    const weak = await verify(token, '1234567')
    expect(weak.statusCode).toBe(400)
    expect(weak.json().error).toBe('invalid-input')
    expect(weak.json().fields).toEqual(['password'])
    expect(await db.select().from(users)).toHaveLength(0)
    expect((await verify(token)).statusCode).toBe(200)
  })

  it('recusa um link vencido (24 horas) e um token que nunca existiu', async () => {
    const token = await pendingToken()
    clock.advance(24 * 60 * MINUTE + 1000)
    expect((await verify(token)).json().error).toBe('invalid-token')
    expect((await verify('A'.repeat(43))).json().error).toBe('invalid-token')
    expect(await db.select().from(users)).toHaveLength(0)
  })

  it('recusa um token malformado como entrada inválida', async () => {
    const response = await verify('curto')
    expect(response.statusCode).toBe(400)
    expect(response.json().error).toBe('invalid-input')
  })

  it('cria uma única conta para duas confirmações simultâneas', async () => {
    const token = await pendingToken()
    const responses = await Promise.all([verify(token), verify(token)])
    expect(responses.map((response) => response.statusCode).sort()).toEqual([200, 400])
    expect(await db.select().from(users)).toHaveLength(1)
  })

  it('apaga a pendência e não cria nada se o e-mail virou conta nesse meio tempo', async () => {
    const token = await pendingToken()
    await signUpForTest(app, db, 'ana@exemplo.com', 'outra-senha-123')

    expect((await verify(token)).json().error).toBe('invalid-token')
    expect(await db.select().from(pendingRegistrations)).toHaveLength(0)
    expect(await db.select().from(users)).toHaveLength(1)
    expect((await login('ana@exemplo.com', 'outra-senha-123')).statusCode).toBe(200)
  })

  it('confirma uma pendência já criada mesmo com o cadastro fechado depois', async () => {
    const token = await pendingToken()
    await closeRegistration()
    expect((await verify(token)).statusCode).toBe(200)
  })
})

describe('intervalo entre envios e reenvio', () => {
  it('dentro do intervalo não envia e devolve o tempo restante; depois troca o link', async () => {
    await register({ email: 'ana@exemplo.com' })
    await app.flushEmail()
    const first = tokenFrom(mail.sent[0])

    clock.advance(20_000)
    const early = await resend('ana@exemplo.com')
    expect(early.statusCode).toBe(202)
    // o limitador conta pelo relógio do banco, então o resto do intervalo varia em 1 s
    expect(early.json().retryAfter).toBeGreaterThanOrEqual(39)
    expect(early.json().retryAfter).toBeLessThanOrEqual(41)
    await app.flushEmail()
    expect(mail.sent).toHaveLength(1)

    clock.advance(41_000)
    const later = await resend('ana@exemplo.com')
    expect(later.json()).toEqual({ retryAfter: 60 })
    await app.flushEmail()
    expect(mail.sent).toHaveLength(2)
    const second = tokenFrom(mail.sent[1])

    expect(second).not.toBe(first)
    expect((await verify(first)).json().error).toBe('invalid-token')
    expect((await verify(second)).statusCode).toBe(200)
  })

  it('o tempo restante é igual com pendência, com conta e sem nada para o e-mail', async () => {
    await signUpForTest(app, db, 'conta@exemplo.com', PASSWORD)
    await register({ email: 'pendente@exemplo.com' })
    await register({ email: 'conta@exemplo.com' })
    await resend('nada@exemplo.com')
    clock.advance(25_000)

    const answers = [
      (await resend('pendente@exemplo.com')).json().retryAfter,
      (await register({ email: 'conta@exemplo.com' })).json().retryAfter,
      (await resend('nada@exemplo.com')).json().retryAfter,
    ]
    for (const seconds of answers) {
      expect(Math.abs(seconds - answers[0])).toBeLessThanOrEqual(1)
    }
  })

  it('responde igual sem pendência e não envia', async () => {
    const response = await resend('ninguem@exemplo.com')
    expect(response.statusCode).toBe(202)
    expect(response.json()).toEqual({ retryAfter: 60 })
    await app.flushEmail()
    expect(mail.sent).toHaveLength(0)
  })

  it('refaz o link vencido', async () => {
    await register({ email: 'ana@exemplo.com' })
    await app.flushEmail()
    clock.advance(25 * 60 * MINUTE)
    await resend('ana@exemplo.com')
    await app.flushEmail()
    expect(mail.sent).toHaveLength(2)
    expect((await verify(tokenFrom(mail.sent[1]))).statusCode).toBe(200)
  })

  it('um cadastro repetido dentro do intervalo não troca o link', async () => {
    await register({ email: 'ana@exemplo.com' })
    clock.advance(10_000)
    await register({ email: 'ana@exemplo.com' })
    await app.flushEmail()
    expect(mail.sent).toHaveLength(1)
  })

  it('um cadastro repetido depois do intervalo troca o link', async () => {
    await register({ email: 'ana@exemplo.com' })
    await app.flushEmail()
    clock.advance(61_000)
    await register({ email: 'ana@exemplo.com' })
    await app.flushEmail()
    expect(mail.sent).toHaveLength(2)
    expect((await verify(tokenFrom(mail.sent[0]))).json().error).toBe('invalid-token')
    expect((await verify(tokenFrom(mail.sent[1]))).statusCode).toBe(200)
  })

  it('se o envio falha, a pessoa não espera o intervalo por um e-mail que não chegou', async () => {
    mail.outcomes = [{ ok: false, reason: 'failed' }]
    await register({ email: 'ana@exemplo.com' })
    await app.flushEmail()
    expect(mail.sent).toHaveLength(1)

    const retry = await resend('ana@exemplo.com')
    expect(retry.json()).toEqual({ retryAfter: 60 })
    await app.flushEmail()
    expect(mail.sent).toHaveLength(2)
  })
})

describe('POST /api/auth/register sob pedidos simultâneos', () => {
  it('não deixa passar mais que o limite por endereço de rede', async () => {
    const responses = await Promise.all(
      Array.from({ length: 15 }, (_, i) =>
        register({ email: `x${i}` }, { remoteAddress: '10.0.0.2' }),
      ),
    )
    const codes = responses.map((response) => response.statusCode)
    expect(codes.filter((code) => code === 400)).toHaveLength(10)
    const blocked = responses.filter((response) => response.statusCode === 429)
    expect(blocked).toHaveLength(5)
    for (const response of blocked) expect(response.json().retryAfter).toBeGreaterThan(0)
  })
})
