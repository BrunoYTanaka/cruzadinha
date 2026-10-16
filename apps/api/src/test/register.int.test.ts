import type { FastifyInstance } from 'fastify'
import { afterAll, afterEach, beforeEach, describe, expect, it } from 'vitest'
import { rateLimitAttempts, sessions, users } from '../db/schema'
import { sha256Hex } from '../lib/tokens'
import { buildTestApp, sessionCookieFrom } from './app'
import { MINUTE, openTestDatabase, testClock, truncateAll, type TestClock } from './database'

const handle = openTestDatabase()
const { db } = handle

let clock: TestClock
let app: FastifyInstance

beforeEach(async () => {
  await truncateAll(db)
  clock = testClock()
  app = buildTestApp({ database: db, clock: clock.now })
})
afterEach(() => app.close())
afterAll(() => handle.close())

function register(
  body: Record<string, unknown>,
  options: { remoteAddress?: string; cookie?: string } = {},
) {
  return app.inject({
    method: 'POST',
    url: '/api/auth/register',
    payload: body,
    remoteAddress: options.remoteAddress,
    headers: options.cookie ? { cookie: `sid=${options.cookie}` } : {},
  })
}

// Mesma instância com o cadastro fechado (o padrão fora dos testes, feature 013).
async function closeRegistration() {
  await app.close()
  app = buildTestApp({ database: db, clock: clock.now, env: { REGISTRATION_ENABLED: 'false' } })
}

describe('POST /api/auth/register com o cadastro fechado', () => {
  it('recusa com 403 registration-closed sem criar conta nem contar tentativa', async () => {
    await closeRegistration()
    const response = await register({ email: 'ana@exemplo.com', password: 'senha-boa-123' })

    expect(response.statusCode).toBe(403)
    expect(response.json()).toEqual({
      error: 'registration-closed',
      message: 'O cadastro está fechado no momento.',
    })
    expect(response.headers['set-cookie']).toBeUndefined()
    expect(await db.select().from(users)).toHaveLength(0)
    expect(await db.select().from(rateLimitAttempts)).toHaveLength(0)
  })

  it('recusa também um corpo inválido, sem dizer o motivo', async () => {
    await closeRegistration()
    const response = await register({ email: 'ana', password: '1' })
    expect(response.statusCode).toBe(403)
    expect(response.json().error).toBe('registration-closed')
  })

  it('GET /api/auth/registration diz que está fechado', async () => {
    await closeRegistration()
    const response = await app.inject({ method: 'GET', url: '/api/auth/registration' })
    expect(response.json()).toEqual({ open: false })
    expect(response.headers['cache-control']).toBe('no-store')
  })
})

describe('POST /api/auth/register com o cadastro aberto', () => {
  it('cria a conta só com e-mail e senha e abre a sessão', async () => {
    const response = await register({ email: 'Ana@Exemplo.com ', password: 'senha-boa-123' })

    expect(response.statusCode).toBe(201)
    const body = response.json()
    expect(body).toEqual({ user: { id: expect.any(String), email: 'ana@exemplo.com' } })

    const header = String(response.headers['set-cookie'])
    expect(header).toContain('HttpOnly')
    expect(header).toContain('SameSite=Lax')
    expect(header).toContain('Path=/')
    expect(header).toContain(`Max-Age=${30 * 24 * 60 * 60}`)

    const token = sessionCookieFrom(response.headers['set-cookie'])
    if (!token) throw new Error('sem cookie de sessão')
    const [session] = await db.select().from(sessions)
    expect(session?.tokenHash).toBe(sha256Hex(token))
    expect(session?.userId).toBe(body.user.id)
  })

  it('ignora o código de convite enviado pelo site anterior', async () => {
    const response = await register({
      email: 'ana@exemplo.com',
      password: 'senha-boa-123',
      inviteCode: 'ABCD-EFGH-JKMN-PQRS',
    })
    expect(response.statusCode).toBe(201)
  })

  it('recusa um e-mail que já tem conta com a mensagem genérica', async () => {
    await register({ email: 'ana@exemplo.com', password: 'senha-boa-123' })
    const response = await register({ email: ' ANA@exemplo.com', password: 'outra-senha-123' })

    expect(response.statusCode).toBe(409)
    expect(response.json()).toEqual({
      error: 'registration-failed',
      message: 'Não foi possível concluir o cadastro.',
    })
    expect(await db.select().from(users)).toHaveLength(1)
  })

  it('aponta os campos inválidos e recusa campos desconhecidos', async () => {
    const response = await register({ email: 'ana', password: '1234567' })
    expect(response.statusCode).toBe(400)
    expect(response.json()).toEqual({
      error: 'invalid-input',
      message: 'Dados inválidos.',
      fields: ['email', 'password'],
    })

    const extra = await register({ email: 'ana@x.com', password: 'senha-boa-123', papel: 'admin' })
    expect(extra.statusCode).toBe(400)
  })

  it('cria uma única conta para dois cadastros simultâneos do mesmo e-mail', async () => {
    const responses = await Promise.all(
      [1, 2].map(() => register({ email: 'ana@x.com', password: 'senha-boa-123' })),
    )
    expect(responses.map((response) => response.statusCode).sort()).toEqual([201, 409])
    expect(await db.select().from(users)).toHaveLength(1)
  })

  it('limita os cadastros por endereço de rede', async () => {
    for (let i = 0; i < 10; i++) {
      const response = await register(
        { email: `x${i}@x.com`, password: '1234567' },
        { remoteAddress: '10.0.0.1' },
      )
      expect(response.statusCode).toBe(400)
    }

    const blocked = await register(
      { email: 'ana@x.com', password: 'senha-boa-123' },
      { remoteAddress: '10.0.0.1' },
    )
    expect(blocked.statusCode).toBe(429)
    expect(blocked.json()).toEqual({
      error: 'too-many-attempts',
      message: 'Muitas tentativas, tente mais tarde.',
    })
    expect(Number(blocked.headers['retry-after'])).toBeGreaterThan(0)

    const otherAddress = await register(
      { email: 'bia@x.com', password: '1234567' },
      { remoteAddress: '10.0.0.2' },
    )
    expect(otherAddress.statusCode).toBe(400)

    clock.advance(61 * MINUTE)
    const later = await register(
      { email: 'ana@x.com', password: 'senha-boa-123' },
      { remoteAddress: '10.0.0.1' },
    )
    expect(later.statusCode).toBe(201)
  })

  it('nunca guarda nem devolve a senha ou o hash', async () => {
    const response = await register({ email: 'ana@x.com', password: 'senha-boa-123' })
    const [user] = await db.select().from(users)

    expect(user?.passwordHash.startsWith('$argon2id$')).toBe(true)
    expect(user?.passwordHash).not.toContain('senha-boa-123')
    expect(response.body).not.toContain('argon2')
    expect(response.body).not.toContain('senha-boa-123')
  })

  it('cadastra uma conta nova mesmo chamado com outra sessão ativa', async () => {
    const first = await register({ email: 'ana@x.com', password: 'senha-boa-123' })
    const cookie = sessionCookieFrom(first.headers['set-cookie'])

    const response = await register({ email: 'bia@x.com', password: 'senha-boa-123' }, { cookie })
    expect(response.statusCode).toBe(201)
    expect(response.json().user.email).toBe('bia@x.com')
  })

  it('GET /api/auth/registration diz que está aberto', async () => {
    const response = await app.inject({ method: 'GET', url: '/api/auth/registration' })
    expect(response.json()).toEqual({ open: true })
  })
})
