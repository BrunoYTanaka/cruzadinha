import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { Database } from '../../db/client'
import { sha256Hex } from '../../lib/tokens'
import type { EmailService } from '../email/email.service'
import type { EmailMessage } from '../email/types'
import { defaultRateLimits } from '../rate-limit/limits'
import type { RateLimitKey, RateLimitRepository } from '../rate-limit/rate-limit.repository'
import { createRateLimiter } from '../rate-limit/rate-limit.service'
import { createRegistrationService } from './registration.service'

const repos = vi.hoisted(() => ({
  userExists: false,
  pendingExists: true,
  consumed: undefined as { email: string } | undefined,
  inserted: true,
  upserts: [] as { email: string; tokenHash: string }[],
  renewals: [] as { email: string; tokenHash: string }[],
  created: [] as { email: string; passwordHash: string }[],
}))

vi.mock('./pending.repository', () => ({
  upsertPending: async (_db: unknown, values: { email: string; tokenHash: string }) => {
    repos.upserts.push(values)
  },
  renewPendingToken: async (_db: unknown, values: { email: string; tokenHash: string }) => {
    if (repos.pendingExists) repos.renewals.push(values)
    return repos.pendingExists
  },
  consumePendingByTokenHash: async () => repos.consumed,
}))
vi.mock('./users.repository', () => ({
  findUserByEmail: async () => (repos.userExists ? { userId: 'u1' } : undefined),
  insertIfEmailFree: async (_db: unknown, values: { email: string; passwordHash: string }) => {
    if (!repos.inserted) return undefined
    repos.created.push(values)
    return { userId: 'u1', email: values.email }
  },
}))
vi.mock('../../lib/password', () => ({ hashPassword: async (value: string) => `hash:${value}` }))

function memoryRateRepository(): RateLimitRepository {
  const rows: (RateLimitKey & { at: Date })[] = []
  const same = (a: RateLimitKey, b: RateLimitKey) =>
    a.action === b.action && a.keyType === b.keyType && a.keyValue === b.keyValue
  return {
    async countSince(key, since) {
      const hits = rows.filter((row) => same(row, key) && row.at > since)
      return {
        count: hits.length,
        oldest: hits.length ? new Date(Math.min(...hits.map((row) => row.at.getTime()))) : null,
      }
    },
    async record(keys, now) {
      for (const key of keys) rows.push({ ...key, at: now })
    },
    async clear(key) {
      for (let i = rows.length - 1; i >= 0; i--)
        if (same(rows[i] as RateLimitKey, key)) rows.splice(i, 1)
    },
  }
}

let now: Date
let sent: { kind: string; message: EmailMessage; undo: (() => Promise<void>) | undefined }[]

const email: EmailService = {
  intervalSeconds: 60,
  admit: async () => ({ ok: true }),
  flush: async () => {},
  sendAfterResponse(kind, message, undo) {
    sent.push({ kind, message, undo })
  },
}

function service() {
  return createRegistrationService({
    db: { transaction: async (run: (tx: unknown) => unknown) => run({}) } as unknown as Database,
    clock: () => now,
    email,
    rateLimiter: createRateLimiter(memoryRateRepository()),
    limits: defaultRateLimits,
    baseUrl: 'https://site.example',
  })
}

const tokenOf = (message: EmailMessage) =>
  /#token=([A-Za-z0-9_-]{43})/.exec(message.text)?.[1] ?? ''

beforeEach(() => {
  now = new Date('2026-10-26T12:00:00Z')
  sent = []
  Object.assign(repos, {
    userExists: false,
    pendingExists: true,
    consumed: undefined,
    inserted: true,
    upserts: [],
    renewals: [],
    created: [],
  })
})

describe('requestRegistration', () => {
  it('stores only the token hash and sends the link for a new e-mail', async () => {
    const result = await service().requestRegistration({ email: 'ana@x.com' })

    expect(result).toEqual({ retryAfter: 60 })
    expect(sent).toHaveLength(1)
    expect(sent[0]?.kind).toBe('signup')
    expect(sent[0]?.message.to).toBe('ana@x.com')
    const token = tokenOf(sent[0]?.message as EmailMessage)
    expect(token).toHaveLength(43)
    expect(repos.upserts).toEqual([
      expect.objectContaining({ email: 'ana@x.com', tokenHash: sha256Hex(token) }),
    ])
    expect(sent[0]?.message.text).toContain('https://site.example/verificar-email#token=')
  })

  it('warns the owner of an existing account, creates no pending row and sends no link', async () => {
    repos.userExists = true
    const result = await service().requestRegistration({ email: 'ana@x.com' })

    expect(result).toEqual({ retryAfter: 60 })
    expect(repos.upserts).toHaveLength(0)
    expect(sent).toHaveLength(1)
    expect(sent[0]?.message.text).not.toContain('#token=')
  })

  it('inside the interval sends nothing and counts the time down the same with or without an account', async () => {
    const known = service()
    repos.userExists = true
    await known.requestRegistration({ email: 'conta@x.com' })
    repos.userExists = false
    await known.requestRegistration({ email: 'nova@x.com' })
    sent.length = 0

    now = new Date(now.getTime() + 20_000)
    repos.userExists = true
    const withAccount = await known.requestRegistration({ email: 'conta@x.com' })
    repos.userExists = false
    const without = await known.requestRegistration({ email: 'nova@x.com' })

    expect(sent).toHaveLength(0)
    expect(withAccount).toEqual({ retryAfter: 40 })
    expect(without).toEqual({ retryAfter: 40 })
  })

  it('hands the interval back when no e-mail went out', async () => {
    const svc = service()
    await svc.requestRegistration({ email: 'ana@x.com' })
    await sent[0]?.undo?.()
    sent.length = 0

    const again = await svc.requestRegistration({ email: 'ana@x.com' })
    expect(again).toEqual({ retryAfter: 60 })
    expect(sent).toHaveLength(1)
  })
})

describe('resendVerification', () => {
  it('swaps the token of an existing pending row and sends the new link', async () => {
    await service().resendVerification('ana@x.com')
    expect(repos.renewals).toHaveLength(1)
    expect(sent).toHaveLength(1)
    expect(repos.renewals[0]?.tokenHash).toBe(sha256Hex(tokenOf(sent[0]?.message as EmailMessage)))
  })

  it('without a pending row sends nothing but keeps counting the interval', async () => {
    repos.pendingExists = false
    const svc = service()
    expect(await svc.resendVerification('ninguem@x.com')).toEqual({ retryAfter: 60 })
    now = new Date(now.getTime() + 25_000)
    expect(await svc.resendVerification('ninguem@x.com')).toEqual({ retryAfter: 35 })
    expect(sent).toHaveLength(0)
  })
})

describe('verifyEmail', () => {
  const input = { token: 'a'.repeat(43), password: 'senha-escolhida-1' }

  it('creates the account with the password sent with the token', async () => {
    repos.consumed = { email: 'ana@x.com' }
    expect(await service().verifyEmail(input)).toEqual({ ok: true })
    expect(repos.created).toEqual([{ email: 'ana@x.com', passwordHash: 'hash:senha-escolhida-1' }])
  })

  it('refuses an unknown, expired or used token and creates nothing', async () => {
    expect(await service().verifyEmail(input)).toEqual({ ok: false, reason: 'invalid-token' })
    expect(repos.created).toHaveLength(0)
  })

  it('refuses when the e-mail became an account meanwhile', async () => {
    repos.consumed = { email: 'ana@x.com' }
    repos.inserted = false
    expect(await service().verifyEmail(input)).toEqual({ ok: false, reason: 'invalid-token' })
  })
})
