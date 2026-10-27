import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { Database } from '../../../platform/db/client'
import { sha256Hex } from '../../../platform/lib/tokens'
import type { EmailService } from '../../../platform/email/email.service'
import type { EmailMessage } from '../../../platform/email/types'
import { defaultRateLimits } from '../../../platform/rate-limit/limits'
import { createMemoryRateRepository } from '../../../platform/rate-limit/memory-repository'
import { createRateLimiter } from '../../../platform/rate-limit/rate-limit.service'
import { createAccountService } from './account.service'

const repos = vi.hoisted(() => ({
  user: undefined as { userId: string; email: string; passwordHash: string } | undefined,
  other: undefined as { userId: string } | undefined,
  consumed: undefined as { userId: string; newEmail: string } | undefined,
  emailUpdate: 'updated' as 'updated' | 'taken',
  upserts: [] as { userId: string; newEmail: string; tokenHash: string; expiresAt: Date }[],
  calls: [] as string[],
}))

vi.mock('./email-change.repository', () => ({
  EMAIL_CHANGE_TTL_MINUTES: 60,
  upsertEmailChange: async (
    _db: unknown,
    values: { userId: string; newEmail: string; tokenHash: string; expiresAt: Date },
  ) => {
    repos.upserts.push(values)
  },
  consumeEmailChange: async () => repos.consumed,
  deleteEmailChangeFor: async () => {
    repos.calls.push('deleteRequest')
  },
}))
vi.mock('../recovery/reset-tokens.repository', () => ({
  revokeOpenResetTokens: async () => {
    repos.calls.push('revoke')
  },
}))
vi.mock('../sessions/sessions.repository', () => ({
  endOtherSessionsForUser: async (_db: unknown, _id: string, keep: string) => {
    repos.calls.push(`endOthers:${keep}`)
  },
}))
vi.mock('../users.repository', () => ({
  findUserById: async () => repos.user,
  findUserByEmail: async () => repos.other,
  updatePasswordHash: async (_db: unknown, _id: string, hash: string) => {
    repos.calls.push(`password:${hash}`)
  },
  updateEmail: async () => {
    repos.calls.push('updateEmail')
    return repos.emailUpdate
  },
  deleteUser: async () => {
    repos.calls.push('deleteUser')
  },
}))
vi.mock('../../../platform/rate-limit/rate-limit.repository', async (importOriginal) => ({
  ...(await importOriginal<object>()),
  deleteUserAttempts: async () => {
    repos.calls.push('deleteAttempts')
  },
}))
vi.mock('../../../platform/lib/password', () => ({
  hashPassword: async (value: string) => `hash:${value}`,
  verifyPassword: async (hash: string, value: string) => hash === `hash:${value}`,
}))

let now: Date
let sent: { message: EmailMessage; undo: (() => Promise<void>) | undefined }[]

const email: EmailService = {
  intervalSeconds: 60,
  admit: async () => ({ ok: true }),
  flush: async () => {},
  sendAfterResponse(_kind, message, undo) {
    sent.push({ message, undo })
  },
}

function service() {
  return createAccountService({
    db: { transaction: async (run: (tx: unknown) => unknown) => run({}) } as unknown as Database,
    clock: () => now,
    email,
    rateLimiter: createRateLimiter(createMemoryRateRepository()),
    limits: defaultRateLimits,
    baseUrl: 'https://site.example',
  })
}

const caller = { userId: 'u1', currentPassword: 'senha-atual-123' }

beforeEach(() => {
  now = new Date('2026-10-27T12:00:00Z')
  sent = []
  Object.assign(repos, {
    user: { userId: 'u1', email: 'ana@x.com', passwordHash: 'hash:senha-atual-123' },
    other: undefined,
    consumed: undefined,
    emailUpdate: 'updated',
    upserts: [],
    calls: [],
  })
})

describe('changePassword', () => {
  const input = { ...caller, keepTokenHash: 'keep', newPassword: 'senha-nova-456' }

  it('stores the new hash, ends the other sessions and revokes the recovery links', async () => {
    expect(await service().changePassword(input)).toEqual({ ok: true })
    expect(repos.calls).toEqual(['password:hash:senha-nova-456', 'endOthers:keep', 'revoke'])
  })

  it('changes nothing for a wrong current password and repeats the same answer', async () => {
    const svc = service()
    const wrong = { ...input, currentPassword: 'errada' }
    expect(await svc.changePassword(wrong)).toEqual({ ok: false, reason: 'wrong-password' })
    expect(await svc.changePassword(wrong)).toEqual({ ok: false, reason: 'wrong-password' })
    expect(repos.calls).toEqual([])
  })

  it('refuses the 6th wrong attempt with 429 and a correct one resets the bucket', async () => {
    const svc = service()
    const wrong = { ...input, currentPassword: 'errada' }
    for (let i = 0; i < 5; i++) await svc.changePassword(wrong)
    expect(await svc.changePassword(wrong)).toMatchObject({
      ok: false,
      reason: 'too-many-attempts',
    })

    const fresh = service()
    for (let i = 0; i < 4; i++) await fresh.changePassword(wrong)
    expect(await fresh.changePassword(input)).toEqual({ ok: true })
    for (let i = 0; i < 5; i++) {
      expect(await fresh.changePassword(wrong)).toEqual({ ok: false, reason: 'wrong-password' })
    }
  })
})

describe('requestEmailChange', () => {
  const input = { ...caller, newEmail: 'nova@x.com' }

  it('stores a 60 minute request and sends the link to the new address and a notice to the old', async () => {
    expect(await service().requestEmailChange(input)).toEqual({ ok: true, retryAfter: 60 })

    const [link, notice] = sent
    const token = /#token=([A-Za-z0-9_-]{43})/.exec(link?.message.text ?? '')?.[1] ?? ''
    expect(link?.message.to).toBe('nova@x.com')
    expect(link?.message.text).toContain('https://site.example/confirmar-email#token=')
    expect(repos.upserts[0]?.tokenHash).toBe(sha256Hex(token))
    expect(repos.upserts[0]?.expiresAt.toISOString()).toBe('2026-10-27T13:00:00.000Z')
    expect(notice?.message.to).toBe('ana@x.com')
    expect(notice?.message.text).not.toContain('nova@x.com')
  })

  it('for an address of another account stores nothing, drops the old request and still sends the notice', async () => {
    repos.other = { userId: 'u2' }
    expect(await service().requestEmailChange(input)).toEqual({ ok: true, retryAfter: 60 })
    expect(repos.upserts).toHaveLength(0)
    expect(repos.calls).toEqual(['deleteRequest'])
    expect(sent.map((item) => item.message.to)).toEqual(['ana@x.com'])
  })

  it('refuses the current address without spending the interval', async () => {
    const svc = service()
    expect(await svc.requestEmailChange({ ...input, newEmail: 'ana@x.com' })).toEqual({
      ok: false,
      reason: 'same-email',
    })
    expect(await svc.requestEmailChange(input)).toEqual({ ok: true, retryAfter: 60 })
  })

  it('inside the interval answers with the remainder, saves and sends nothing', async () => {
    const svc = service()
    await svc.requestEmailChange(input)
    sent.length = 0
    repos.upserts.length = 0
    now = new Date(now.getTime() + 20_000)
    expect(await svc.requestEmailChange({ ...input, newEmail: 'outra@x.com' })).toEqual({
      ok: true,
      retryAfter: 40,
    })
    expect(sent).toHaveLength(0)
    expect(repos.upserts).toHaveLength(0)
  })

  it('gives the interval back only when no e-mail left', async () => {
    const svc = service()
    await svc.requestEmailChange(input)
    await sent[0]?.undo?.()
    // só o link falhou: o aviso saiu, então o intervalo continua contado
    expect(await svc.requestEmailChange(input)).toEqual({ ok: true, retryAfter: 60 })
    expect(sent).toHaveLength(2)

    const other = service()
    sent.length = 0
    await other.requestEmailChange(input)
    await sent[0]?.undo?.()
    await sent[1]?.undo?.()
    await other.requestEmailChange(input)
    expect(sent).toHaveLength(4)
  })

  it('sends nothing for a wrong current password', async () => {
    expect(await service().requestEmailChange({ ...input, currentPassword: 'errada' })).toEqual({
      ok: false,
      reason: 'wrong-password',
    })
    expect(sent).toHaveLength(0)
  })
})

describe('confirmEmailChange', () => {
  const input = { token: 'b'.repeat(43) }

  it('changes the e-mail and revokes the recovery links', async () => {
    repos.consumed = { userId: 'u1', newEmail: 'nova@x.com' }
    expect(await service().confirmEmailChange(input)).toEqual({ ok: true })
    expect(repos.calls).toEqual(['updateEmail', 'revoke'])
  })

  it('answers invalid-token for an unknown, used or expired link', async () => {
    expect(await service().confirmEmailChange(input)).toEqual({
      ok: false,
      reason: 'invalid-token',
    })
    expect(repos.calls).toEqual([])
  })

  it('answers invalid-token when another account took the address meanwhile', async () => {
    repos.consumed = { userId: 'u1', newEmail: 'nova@x.com' }
    repos.emailUpdate = 'taken'
    expect(await service().confirmEmailChange(input)).toEqual({
      ok: false,
      reason: 'invalid-token',
    })
    expect(repos.calls).toEqual(['updateEmail'])
  })
})

describe('deleteAccount', () => {
  it('deletes the user and its attempts after the password', async () => {
    expect(await service().deleteAccount(caller)).toEqual({ ok: true })
    expect(repos.calls).toEqual(['deleteUser', 'deleteAttempts'])
  })

  it('deletes nothing for a wrong password', async () => {
    expect(await service().deleteAccount({ ...caller, currentPassword: 'errada' })).toEqual({
      ok: false,
      reason: 'wrong-password',
    })
    expect(repos.calls).toEqual([])
  })
})
