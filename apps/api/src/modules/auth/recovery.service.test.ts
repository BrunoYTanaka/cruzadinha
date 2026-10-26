import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { Database } from '../../db/client'
import { sha256Hex } from '../../lib/tokens'
import type { EmailService } from '../email/email.service'
import type { EmailMessage } from '../email/types'
import { defaultRateLimits } from '../rate-limit/limits'
import type { RateLimitKey, RateLimitRepository } from '../rate-limit/rate-limit.repository'
import { createRateLimiter } from '../rate-limit/rate-limit.service'
import { createRecoveryService } from './recovery.service'

const repos = vi.hoisted(() => ({
  user: undefined as { userId: string } | undefined,
  stored: true,
  consumed: undefined as { userId: string } | undefined,
  replaced: [] as { userId: string; tokenHash: string; expiresAt: Date }[],
  calls: [] as string[],
}))

vi.mock('./reset-tokens.repository', () => ({
  replaceResetToken: async (
    _db: unknown,
    values: { userId: string; tokenHash: string; expiresAt: Date },
  ) => {
    if (repos.stored) repos.replaced.push(values)
    return repos.stored
  },
  consumeResetToken: async () => repos.consumed,
  revokeOpenResetTokens: async () => {
    repos.calls.push('revoke')
  },
}))
vi.mock('./sessions.repository', () => ({
  endAllSessionsForUser: async () => {
    repos.calls.push('endSessions')
  },
}))
vi.mock('./users.repository', () => ({
  findUserByEmail: async () => repos.user,
  updatePasswordHash: async (_db: unknown, _id: string, hash: string) => {
    repos.calls.push(`password:${hash}`)
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
  return createRecoveryService({
    db: { transaction: async (run: (tx: unknown) => unknown) => run({}) } as unknown as Database,
    clock: () => now,
    email,
    rateLimiter: createRateLimiter(memoryRateRepository()),
    limits: defaultRateLimits,
    baseUrl: 'https://site.example',
  })
}

beforeEach(() => {
  now = new Date('2026-10-26T12:00:00Z')
  sent = []
  Object.assign(repos, {
    user: { userId: 'u1' },
    stored: true,
    consumed: undefined,
    replaced: [],
    calls: [],
  })
})

describe('requestReset', () => {
  it('stores the token hash for 1 hour and sends the link as recovery mail', async () => {
    expect(await service().requestReset('ana@x.com')).toEqual({ retryAfter: 60 })

    expect(sent).toHaveLength(1)
    expect(sent[0]?.kind).toBe('recovery')
    const token = /#token=([A-Za-z0-9_-]{43})/.exec(sent[0]?.message.text ?? '')?.[1] ?? ''
    expect(sent[0]?.message.text).toContain('https://site.example/redefinir-senha#token=')
    expect(repos.replaced[0]?.tokenHash).toBe(sha256Hex(token))
    expect(repos.replaced[0]?.expiresAt.toISOString()).toBe('2026-10-26T13:00:00.000Z')
  })

  it('answers the same for an unknown e-mail, sends nothing and keeps counting the interval', async () => {
    const svc = service()
    repos.user = undefined
    expect(await svc.requestReset('ninguem@x.com')).toEqual({ retryAfter: 60 })
    repos.user = { userId: 'u1' }
    await svc.requestReset('ana@x.com')
    sent.length = 0

    now = new Date(now.getTime() + 20_000)
    repos.user = undefined
    const unknown = await svc.requestReset('ninguem@x.com')
    repos.user = { userId: 'u1' }
    const known = await svc.requestReset('ana@x.com')
    expect(sent).toHaveLength(0)
    expect(unknown).toEqual({ retryAfter: 40 })
    expect(known).toEqual({ retryAfter: 40 })
  })

  it('sends nothing when a concurrent request already stored the token', async () => {
    repos.stored = false
    const svc = service()
    expect(await svc.requestReset('ana@x.com')).toEqual({ retryAfter: 60 })
    expect(sent).toHaveLength(0)
    // o intervalo foi devolvido: o pedido seguinte volta a valer
    repos.stored = true
    expect(await svc.requestReset('ana@x.com')).toEqual({ retryAfter: 60 })
    expect(sent).toHaveLength(1)
  })
})

describe('resetPassword', () => {
  const input = { token: 'b'.repeat(43), password: 'senha-nova-456' }

  it('sets the new password, revokes the other links and ends every session', async () => {
    repos.consumed = { userId: 'u1' }
    expect(await service().resetPassword(input)).toEqual({ ok: true })
    expect(repos.calls).toEqual(['password:hash:senha-nova-456', 'revoke', 'endSessions'])
  })

  it('changes nothing for an unknown, used or expired token', async () => {
    expect(await service().resetPassword(input)).toEqual({ ok: false, reason: 'invalid-token' })
    expect(repos.calls).toEqual([])
  })
})
