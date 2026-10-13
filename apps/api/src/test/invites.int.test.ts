import { eq } from 'drizzle-orm'
import type { FastifyInstance } from 'fastify'
import { afterAll, afterEach, beforeEach, describe, expect, it } from 'vitest'
import { invites } from '../db/schema'
import { normalizeInviteCode, sha256Hex } from '../lib/tokens'
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

const PASSWORD = 'senha-boa-123'

async function register(email: string, inviteCode?: string) {
  const code =
    inviteCode ??
    (await createInvitesService({ db, clock: clock.now }).createInvite({ days: 7 })).code
  return app.inject({
    method: 'POST',
    url: '/api/auth/register',
    payload: { email, password: PASSWORD, inviteCode: code },
  })
}

async function account(email: string): Promise<string> {
  const response = await register(email)
  const cookie = sessionCookieFrom(response.headers['set-cookie'])
  if (!cookie) throw new Error('cadastro sem cookie')
  return cookie
}

function createInvite(cookie?: string, remoteAddress?: string) {
  return app.inject({
    method: 'POST',
    url: '/api/invites',
    headers: cookie ? { cookie: `sid=${cookie}` } : {},
    remoteAddress,
  })
}

function listInvites(cookie?: string) {
  return app.inject({
    method: 'GET',
    url: '/api/invites',
    headers: cookie ? { cookie: `sid=${cookie}` } : {},
  })
}

async function inviteIdOf(code: string): Promise<string> {
  const [row] = await db
    .select({ inviteId: invites.inviteId })
    .from(invites)
    .where(eq(invites.codeHash, sha256Hex(normalizeInviteCode(code))))
  if (!row) throw new Error('convite não encontrado')
  return row.inviteId
}

describe('POST /api/invites', () => {
  it('creates an invite valid for 7 days that registers another account', async () => {
    const cookie = await account('ana@exemplo.com')
    const response = await createInvite(cookie)

    expect(response.statusCode).toBe(201)
    const { code, expiresAt } = response.json()
    expect(code).toMatch(/^[A-Z2-9]{4}(-[A-Z2-9]{4}){3}$/)
    expect(new Date(expiresAt).getTime()).toBe(clock.now().getTime() + 7 * DAY)

    const [row] = await db
      .select()
      .from(invites)
      .where(eq(invites.inviteId, await inviteIdOf(code)))
    expect(row?.codeHash).not.toContain(normalizeInviteCode(code))
    expect((await register('bia@exemplo.com', code)).statusCode).toBe(201)
  })

  it('refuses a fourth active invite', async () => {
    const cookie = await account('ana@exemplo.com')
    for (let i = 0; i < 3; i++) expect((await createInvite(cookie)).statusCode).toBe(201)

    const response = await createInvite(cookie)
    expect(response.statusCode).toBe(409)
    expect(response.json()).toEqual({
      error: 'invite-quota-reached',
      message: 'Você já tem 3 convites ativos.',
    })
  })

  it('frees a slot when an invite is used, expires or is revoked', async () => {
    const cookie = await account('ana@exemplo.com')
    const codes: string[] = []
    for (let i = 0; i < 3; i++) codes.push((await createInvite(cookie)).json().code)

    await register('bia@exemplo.com', codes[0])
    expect((await createInvite(cookie)).statusCode).toBe(201)

    await db
      .update(invites)
      .set({ revokedAt: clock.now() })
      .where(eq(invites.inviteId, await inviteIdOf(codes[1] ?? '')))
    expect((await createInvite(cookie)).statusCode).toBe(201)
    expect((await createInvite(cookie)).statusCode).toBe(409)

    clock.advance(8 * DAY)
    const later = await me(cookie)
    expect(later.statusCode).toBe(200)
    expect((await createInvite(cookie)).statusCode).toBe(201)
  })

  it('never goes past 3 active invites with simultaneous requests', async () => {
    const cookie = await account('ana@exemplo.com')
    for (let i = 0; i < 2; i++) await createInvite(cookie)

    const responses = await Promise.all(Array.from({ length: 5 }, () => createInvite(cookie)))
    expect(responses.filter((response) => response.statusCode === 201)).toHaveLength(1)
    expect(responses.filter((response) => response.statusCode === 409)).toHaveLength(4)
    expect((await listInvites(cookie)).json().invites).toHaveLength(3)
  })

  it('limits invite requests per network address', async () => {
    const cookie = await account('ana@exemplo.com')
    for (let i = 0; i < 10; i++) {
      expect([201, 409]).toContain((await createInvite(cookie, '10.0.0.7')).statusCode)
    }
    const blocked = await createInvite(cookie, '10.0.0.7')
    expect(blocked.statusCode).toBe(429)
    expect(blocked.json().error).toBe('too-many-attempts')

    clock.advance(61 * MINUTE)
    expect((await createInvite(cookie, '10.0.0.7')).statusCode).not.toBe(429)
  })
})

function me(cookie: string) {
  return app.inject({ method: 'GET', url: '/api/auth/me', headers: { cookie: `sid=${cookie}` } })
}

describe('GET /api/invites', () => {
  it('lists only the user invites, newest first, with status and without codes', async () => {
    const cookie = await account('ana@exemplo.com')
    const other = await account('bia@exemplo.com')
    await createInvite(other)
    const cliInvite = await createInvitesService({ db, clock: clock.now }).createInvite({ days: 7 })

    const codes: string[] = []
    for (let i = 0; i < 3; i++) {
      codes.push((await createInvite(cookie)).json().code)
      clock.advance(MINUTE)
    }
    await register('carla@exemplo.com', codes[0])
    await db
      .update(invites)
      .set({ revokedAt: clock.now() })
      .where(eq(invites.inviteId, await inviteIdOf(codes[1] ?? '')))
    await db
      .update(invites)
      .set({ expiresAt: new Date(clock.now().getTime() - 1) })
      .where(eq(invites.inviteId, await inviteIdOf(codes[2] ?? '')))
    codes.push((await createInvite(cookie)).json().code)

    const response = await listInvites(cookie)
    expect(response.statusCode).toBe(200)
    const list = response.json().invites
    expect(list.map((invite: { status: string }) => invite.status)).toEqual([
      'active',
      'expired',
      'revoked',
      'used',
    ])
    for (const invite of list) {
      expect(Object.keys(invite).sort()).toEqual(['createdAt', 'expiresAt', 'status'])
    }
    for (const code of [...codes, cliInvite.code]) {
      expect(response.body).not.toContain(code)
      expect(response.body).not.toContain(normalizeInviteCode(code))
    }
  })

  it('requires a session on both routes', async () => {
    for (const response of [await createInvite(), await listInvites()]) {
      expect(response.statusCode).toBe(401)
      expect(response.json()).toEqual({ error: 'unauthenticated', message: 'Não autenticado.' })
    }
  })
})
