import { eq } from 'drizzle-orm'
import type { FastifyInstance } from 'fastify'
import { afterAll, afterEach, beforeEach, describe, expect, it } from 'vitest'
import { invites, sessions, users } from '../db/schema'
import { sha256Hex } from '../lib/tokens'
import { createInvitesService } from '../modules/invites/invites.service'
import { buildTestApp, sessionCookieFrom } from './app'
import { DAY, MINUTE, openTestDatabase, testClock, truncateAll, type TestClock } from './database'

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

function newInvite(days = 7) {
  return createInvitesService({ db, clock: clock.now }).createInvite({ days })
}

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

async function inviteRow(inviteId: string) {
  const [row] = await db.select().from(invites).where(eq(invites.inviteId, inviteId))
  return row
}

const INVALID_INVITE = { error: 'invalid-invite', message: 'Convite inválido.' }

describe('POST /api/auth/register', () => {
  it('creates the account, consumes the invite and opens a session', async () => {
    const invite = await newInvite()
    const response = await register({
      email: 'Ana@Exemplo.com ',
      password: 'senha-boa-123',
      inviteCode: invite.code,
    })

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

    const row = await inviteRow(invite.inviteId)
    expect(row?.usedByUserId).toBe(body.user.id)
    expect(row?.usedAt).toBeInstanceOf(Date)
  })

  it('answers the same for unknown, used, expired, revoked and malformed codes', async () => {
    const used = await newInvite()
    expect(
      (await register({ email: 'a@x.com', password: 'senha-boa-123', inviteCode: used.code }))
        .statusCode,
    ).toBe(201)

    const revoked = await newInvite()
    await db
      .update(invites)
      .set({ revokedAt: clock.now() })
      .where(eq(invites.inviteId, revoked.inviteId))

    const expired = await newInvite(7)
    clock.advance(8 * DAY)

    const responses = await Promise.all(
      ['ABCD-EFGH-JKMN-PQRS', used.code, expired.code, revoked.code, 'nao-e-um-codigo'].map(
        (inviteCode, index) =>
          register({ email: `b${index}@x.com`, password: 'senha-boa-123', inviteCode }),
      ),
    )
    for (const response of responses) {
      expect(response.statusCode).toBe(400)
      expect(response.json()).toEqual(INVALID_INVITE)
    }
    expect(new Set(responses.map((response) => response.body)).size).toBe(1)
  })

  it('refuses an e-mail that already has an account without spending the invite', async () => {
    const first = await newInvite()
    await register({ email: 'ana@exemplo.com', password: 'senha-boa-123', inviteCode: first.code })

    const second = await newInvite()
    const response = await register({
      email: ' ANA@exemplo.com',
      password: 'outra-senha-123',
      inviteCode: second.code,
    })

    expect(response.statusCode).toBe(409)
    expect(response.json()).toEqual({
      error: 'registration-failed',
      message: 'Não foi possível concluir o cadastro.',
    })
    expect((await inviteRow(second.inviteId))?.usedAt).toBeNull()
  })

  it('points to the invalid fields without spending the invite', async () => {
    const invite = await newInvite()
    const response = await register({
      email: 'ana',
      password: '1234567',
      inviteCode: invite.code,
    })

    expect(response.statusCode).toBe(400)
    expect(response.json()).toEqual({
      error: 'invalid-input',
      message: 'Dados inválidos.',
      fields: ['email', 'password'],
    })
    expect((await inviteRow(invite.inviteId))?.usedAt).toBeNull()
  })

  it('creates exactly one account for two simultaneous uses of one invite', async () => {
    const invite = await newInvite()
    const responses = await Promise.all(
      ['a@x.com', 'b@x.com'].map((email) =>
        register({ email, password: 'senha-boa-123', inviteCode: invite.code }),
      ),
    )

    expect(responses.map((response) => response.statusCode).sort()).toEqual([201, 400])
    expect(await db.select().from(users)).toHaveLength(1)
  })

  it('limits registrations per network address', async () => {
    const invite = await newInvite()
    for (let i = 0; i < 10; i++) {
      const response = await register(
        { email: `x${i}@x.com`, password: '1234567', inviteCode: invite.code },
        { remoteAddress: '10.0.0.1' },
      )
      expect(response.statusCode).toBe(400)
    }

    const blocked = await register(
      { email: 'ana@x.com', password: 'senha-boa-123', inviteCode: invite.code },
      { remoteAddress: '10.0.0.1' },
    )
    expect(blocked.statusCode).toBe(429)
    expect(blocked.json()).toEqual({
      error: 'too-many-attempts',
      message: 'Muitas tentativas, tente mais tarde.',
    })
    expect(Number(blocked.headers['retry-after'])).toBeGreaterThan(0)

    const otherAddress = await register(
      { email: 'bia@x.com', password: '1234567', inviteCode: invite.code },
      { remoteAddress: '10.0.0.2' },
    )
    expect(otherAddress.statusCode).toBe(400)

    clock.advance(61 * MINUTE)
    const later = await register(
      { email: 'ana@x.com', password: 'senha-boa-123', inviteCode: invite.code },
      { remoteAddress: '10.0.0.1' },
    )
    expect(later.statusCode).toBe(201)
  })

  it('accepts the code typed in lowercase with spaces', async () => {
    const invite = await newInvite()
    const typed = ` ${invite.code.toLowerCase().replaceAll('-', ' ')} `
    const response = await register({
      email: 'ana@x.com',
      password: 'senha-boa-123',
      inviteCode: typed,
    })
    expect(response.statusCode).toBe(201)
  })

  it('never stores or returns the password or its hash', async () => {
    const invite = await newInvite()
    const response = await register({
      email: 'ana@x.com',
      password: 'senha-boa-123',
      inviteCode: invite.code,
    })
    const [user] = await db.select().from(users)

    expect(user?.passwordHash.startsWith('$argon2id$')).toBe(true)
    expect(user?.passwordHash).not.toContain('senha-boa-123')
    expect(response.body).not.toContain('argon2')
    expect(response.body).not.toContain('senha-boa-123')
  })

  it('refuses an invite at the exact instant it expires', async () => {
    const invite = await newInvite(1)
    clock.set(invite.expiresAt)
    const response = await register({
      email: 'ana@x.com',
      password: 'senha-boa-123',
      inviteCode: invite.code,
    })

    expect(response.json()).toEqual(INVALID_INVITE)
    expect((await inviteRow(invite.inviteId))?.usedAt).toBeNull()
  })

  it('registers a new account even when called with another active session', async () => {
    const first = await newInvite()
    const firstResponse = await register({
      email: 'ana@x.com',
      password: 'senha-boa-123',
      inviteCode: first.code,
    })
    const cookie = sessionCookieFrom(firstResponse.headers['set-cookie'])

    const second = await newInvite()
    const response = await register(
      { email: 'bia@x.com', password: 'senha-boa-123', inviteCode: second.code },
      { cookie },
    )

    expect(response.statusCode).toBe(201)
    expect(response.json().user.email).toBe('bia@x.com')
    expect(await db.select().from(sessions)).toHaveLength(2)
  })
})
