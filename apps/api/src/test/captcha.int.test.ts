import type { FastifyInstance } from 'fastify'
import { afterAll, afterEach, beforeEach, describe, expect, it } from 'vitest'
import { passwordResetTokens, pendingRegistrations, rateLimitAttempts } from '../platform/db/schema'
import { buildTestApp, fakeCaptcha, signUpForTest } from './app'
import { openTestDatabase, testClock, truncateAll, type TestClock } from './database'
import { fakeEmailSender, type FakeEmailSender } from './fake-email'

const handle = openTestDatabase()
const { db } = handle

let clock: TestClock
let app: FastifyInstance
let mail: FakeEmailSender
let captcha: ReturnType<typeof fakeCaptcha>

function build(env: Record<string, string> = {}) {
  captcha = fakeCaptcha()
  app = buildTestApp({
    database: db,
    clock: clock.now,
    emailSender: mail,
    captchaVerifier: captcha.verifier,
    env: { CAPTCHA_ENABLED: 'true', ...env },
  })
}

beforeEach(async () => {
  await truncateAll(db)
  clock = testClock()
  mail = fakeEmailSender()
  build()
})
afterEach(() => app.close())
afterAll(() => handle.close())

const ROUTES = [
  ['register', '/api/auth/register', 'signup'],
  ['resend-verification', '/api/auth/resend-verification', 'resend'],
  ['forgot-password', '/api/auth/forgot-password', 'forgot'],
] as const

const post = (url: string, payload: Record<string, unknown>) =>
  app.inject({ method: 'POST', url, payload })

const REFUSED = {
  error: 'captcha-failed',
  message: 'Não foi possível confirmar que você é uma pessoa. Tente de novo.',
}

async function counts() {
  return {
    attempts: (await db.select().from(rateLimitAttempts)).length,
    pending: (await db.select().from(pendingRegistrations)).length,
    resets: (await db.select().from(passwordResetTokens)).length,
    sent: mail.sent.length,
  }
}

describe.each(ROUTES)('%s com o captcha ligado', (_name, url, action) => {
  const email = 'ana@exemplo.com'

  it.each([
    ['sem prova', {}],
    ['com prova vazia', { captchaToken: '' }],
    ['com prova grande demais', { captchaToken: 'a'.repeat(2049) }],
    ['com prova inválida', { captchaToken: 'qualquer-coisa' }],
    ['com prova de outra ação', { captchaToken: 'ok-outra' }],
  ])('recusa %s com o mesmo 400 e não gasta nada', async (_case, extra) => {
    const before = await counts()
    const response = await post(url, { email, ...extra })
    expect(response.statusCode).toBe(400)
    expect(response.json()).toEqual(REFUSED)
    expect(response.headers['retry-after']).toBeUndefined()
    expect(await counts()).toEqual(before)
  })

  it('recusa igual para um e-mail com conta e para um sem conta', async () => {
    await signUpForTest(app, db, 'existe@exemplo.com', 'senha-boa-123')
    const withAccount = await post(url, { email: 'existe@exemplo.com', captchaToken: 'ruim' })
    const without = await post(url, { email: 'nao-existe@exemplo.com', captchaToken: 'ruim' })
    expect(withAccount.statusCode).toBe(without.statusCode)
    expect(withAccount.json()).toEqual(without.json())
  })

  it('recusa quando o serviço de verificação está indisponível (fail-closed)', async () => {
    await app.close()
    captcha = fakeCaptcha({ ok: false, reason: 'unavailable' })
    app = buildTestApp({
      database: db,
      clock: clock.now,
      emailSender: mail,
      captchaVerifier: captcha.verifier,
      env: { CAPTCHA_ENABLED: 'true' },
    })
    const response = await post(url, { email, captchaToken: `ok-${action}` })
    expect(response.statusCode).toBe(400)
    expect(response.json()).toEqual(REFUSED)
  })

  it('aceita a prova certa e confere a ação da rota', async () => {
    const response = await post(url, { email, captchaToken: `ok-${action}` })
    expect(response.statusCode).toBe(202)
    expect(captcha.calls).toHaveLength(1)
    expect(captcha.calls[0]).toMatchObject({ token: `ok-${action}`, action })
  })

  it('recusados em volta não gastam o intervalo nem o limite do pedido bom', async () => {
    for (let i = 0; i < 30; i++) await post(url, { email, captchaToken: 'ruim' })
    expect(await counts()).toEqual({ attempts: 0, pending: 0, resets: 0, sent: 0 })
    const good = await post(url, { email, captchaToken: `ok-${action}` })
    expect(good.statusCode).toBe(202)
  })
})

describe('com o captcha desligado', () => {
  it.each(ROUTES)('%s ignora a prova e não chama o verificador', async (_name, url) => {
    await app.close()
    build({ CAPTCHA_ENABLED: 'false' })
    const withBadToken = await post(url, { email: 'ana@exemplo.com', captchaToken: 'ruim' })
    const withoutToken = await post(url, { email: 'bia@exemplo.com' })
    expect(withBadToken.statusCode).toBe(202)
    expect(withoutToken.statusCode).toBe(202)
    expect(captcha.calls).toHaveLength(0)
  })
})

describe('ordem e rotas fora do captcha', () => {
  it.each(ROUTES.slice(0, 2))(
    '%s com o cadastro fechado responde 403 antes de consultar o verificador',
    async (_name, url) => {
      await app.close()
      build({ REGISTRATION_ENABLED: 'false' })
      const response = await post(url, { email: 'ana@exemplo.com', captchaToken: 'ruim' })
      expect(response.statusCode).toBe(403)
      expect(response.json().error).toBe('registration-closed')
      expect(captcha.calls).toHaveLength(0)
    },
  )

  it('verify-email e reset-password nunca chamam o verificador', async () => {
    await post('/api/auth/verify-email', { token: 'A'.repeat(43), password: 'senha-boa-123' })
    await post('/api/auth/reset-password', { token: 'A'.repeat(43), password: 'senha-boa-123' })
    expect(captcha.calls).toHaveLength(0)
  })
})

describe('GET /api/auth/registration', () => {
  it.each([
    ['true', true],
    ['false', false],
  ])('mostra captchaRequired com CAPTCHA_ENABLED=%s', async (value, expected) => {
    await app.close()
    build({ CAPTCHA_ENABLED: value })
    const response = await app.inject({ method: 'GET', url: '/api/auth/registration' })
    expect(response.json()).toEqual({ open: true, captchaRequired: expected })
  })
})

describe('site anterior (sem captchaToken)', () => {
  it.each(ROUTES)('%s aceita o corpo antigo com o interruptor desligado', async (_name, url) => {
    await app.close()
    build({ CAPTCHA_ENABLED: 'false' })
    const response = await post(url, { email: 'ana@exemplo.com' })
    expect(response.statusCode).toBe(202)
  })
})
