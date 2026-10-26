import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { EmailConfig } from '../../config'
import type { Executor } from '../../db/client'
import type { RateLimitKey, RateLimitRepository } from '../rate-limit/rate-limit.repository'
import { createRateLimiter } from '../rate-limit/rate-limit.service'
import { createEmailService } from './email.service'
import type { EmailMessage, EmailSender, SendResult } from './types'

const blocks = vi.hoisted(() => ({
  active: undefined as Date | undefined,
  saved: [] as { blockedUntil: Date; reason: string }[],
}))

vi.mock('./send-block.repository', () => ({
  findActiveBlock: async (_db: unknown, now: Date) =>
    blocks.active && blocks.active > now ? blocks.active : undefined,
  upsertBlock: async (_db: unknown, values: { blockedUntil: Date; reason: string }) => {
    blocks.saved.push(values)
    blocks.active = values.blockedUntil
  },
}))

const config: EmailConfig = {
  apiKey: 'k',
  from: 'a@b.com',
  baseUrl: 'https://x.example',
  resendIntervalSeconds: 60,
  perAddressDailyMax: 2,
  dailyCeiling: 5,
  recoveryReserve: 2,
}

function memoryRateRepository(): RateLimitRepository & { rows: (RateLimitKey & { at: Date })[] } {
  const rows: (RateLimitKey & { at: Date })[] = []
  const same = (a: RateLimitKey, b: RateLimitKey) =>
    a.action === b.action && a.keyType === b.keyType && a.keyValue === b.keyValue
  return {
    rows,
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
    async clear() {},
  }
}

let now: Date
let outcomes: SendResult[]
let sent: EmailMessage[]
const sender: EmailSender = {
  async send(message) {
    sent.push(message)
    return outcomes.shift() ?? { ok: true }
  },
}
const warn = vi.fn()

function setup(overrides: Partial<EmailConfig> = {}, withSender = true) {
  const repository = memoryRateRepository()
  const service = createEmailService({
    db: {} as Executor,
    clock: () => now,
    sender: withSender ? sender : undefined,
    rateLimiter: createRateLimiter(repository),
    config: { ...config, ...overrides },
    logger: { warn },
  })
  return { service, repository }
}

const message = (to: string): EmailMessage => ({
  to,
  subject: 's',
  text: 't',
  html: 'h',
  idempotencyKey: `k-${to}`,
})

beforeEach(() => {
  now = new Date('2026-10-26T12:00:00Z')
  outcomes = []
  sent = []
  blocks.active = undefined
  blocks.saved = []
  warn.mockClear()
})

describe('admit', () => {
  it('lets the request through with a sender and no block', async () => {
    expect(await setup().service.admit()).toEqual({ ok: true })
  })

  it('refuses with a retry time when there is no sender', async () => {
    const result = await setup({}, false).service.admit()
    expect(result.ok).toBe(false)
  })

  it('refuses until the end of an active block and never before it', async () => {
    blocks.active = new Date('2026-10-26T12:10:00Z')
    expect(await setup().service.admit()).toEqual({ ok: false, retryAfterSeconds: 600 })
    now = new Date('2026-10-26T12:10:01Z')
    expect(await setup().service.admit()).toEqual({ ok: true })
  })
})

describe('sendAfterResponse', () => {
  it('sends and counts the e-mail globally and per address', async () => {
    const { service, repository } = setup()
    service.sendAfterResponse('signup', message('a@x.com'))
    await service.flush()
    expect(sent).toHaveLength(1)
    expect(repository.rows.map((row) => row.keyType).sort()).toEqual(['EMAIL', 'GLOBAL'])
  })

  it('keeps the last slots for recovery: signup stops at ceiling minus reserve', async () => {
    const { service } = setup({ perAddressDailyMax: 10 })
    for (const name of ['a', 'b', 'c', 'd']) {
      service.sendAfterResponse('signup', message(`${name}@x.com`))
      await service.flush()
    }
    // teto 5, reserva 2: o cadastro envia 3 e a recuperação ainda envia
    expect(sent).toHaveLength(3)
    service.sendAfterResponse('recovery', message('e@x.com'))
    await service.flush()
    expect(sent).toHaveLength(4)
  })

  it('stops an address at its daily maximum', async () => {
    const { service } = setup()
    for (let i = 0; i < 4; i += 1) {
      service.sendAfterResponse('recovery', message('a@x.com'))
      await service.flush()
    }
    expect(sent).toHaveLength(2)
  })

  it('saves a block on a daily quota error, until the next UTC midnight', async () => {
    outcomes = [{ ok: false, reason: 'quota-daily' }]
    const { service, repository } = setup()
    service.sendAfterResponse('signup', message('a@x.com'))
    await service.flush()
    expect(blocks.saved).toEqual([
      { blockedUntil: new Date('2026-10-27T00:00:00Z'), reason: 'daily_quota_exceeded' },
    ])
    expect(repository.rows).toHaveLength(0)
    // com a trava ativa, o próximo envio nem chama o provedor
    service.sendAfterResponse('recovery', message('b@x.com'))
    await service.flush()
    expect(sent).toHaveLength(1)
  })

  it('saves a monthly block until the next month', async () => {
    outcomes = [{ ok: false, reason: 'quota-monthly' }]
    const { service } = setup()
    service.sendAfterResponse('signup', message('a@x.com'))
    await service.flush()
    expect(blocks.saved[0]).toEqual({
      blockedUntil: new Date('2026-11-01T00:00:00Z'),
      reason: 'monthly_quota_exceeded',
    })
  })

  it.each(['rate-limited', 'failed'] as const)(
    'does not block on %s and logs no address',
    async (reason) => {
      outcomes = [{ ok: false, reason }]
      const { service } = setup()
      service.sendAfterResponse('signup', message('a@x.com'))
      await service.flush()
      expect(blocks.saved).toHaveLength(0)
      expect(JSON.stringify(warn.mock.calls)).not.toContain('a@x.com')
    },
  )

  it('never throws, even when the sender does', async () => {
    const service = createEmailService({
      db: {} as Executor,
      clock: () => now,
      sender: {
        async send() {
          throw new Error('boom a@x.com')
        },
      },
      rateLimiter: createRateLimiter(memoryRateRepository()),
      config,
      logger: { warn },
    })
    service.sendAfterResponse('signup', message('a@x.com'))
    await expect(service.flush()).resolves.toBeUndefined()
    expect(JSON.stringify(warn.mock.calls)).not.toContain('a@x.com')
  })
})

describe('onNotSent', () => {
  it('runs when the e-mail does not go out: block, ceiling or a failed send', async () => {
    const undone = vi.fn(async () => {})

    outcomes = [{ ok: false, reason: 'failed' }]
    const { service } = setup()
    service.sendAfterResponse('signup', message('a@x.com'), undone)
    await service.flush()
    expect(undone).toHaveBeenCalledTimes(1)

    blocks.active = new Date('2026-10-27T00:00:00Z')
    service.sendAfterResponse('signup', message('b@x.com'), undone)
    await service.flush()
    expect(undone).toHaveBeenCalledTimes(2)

    blocks.active = undefined
    const full = setup({ perAddressDailyMax: 1 })
    full.service.sendAfterResponse('signup', message('c@x.com'))
    await full.service.flush()
    full.service.sendAfterResponse('signup', message('c@x.com'), undone)
    await full.service.flush()
    expect(undone).toHaveBeenCalledTimes(3)
  })

  it('does not run when the e-mail was sent', async () => {
    const undone = vi.fn(async () => {})
    const { service } = setup()
    service.sendAfterResponse('signup', message('a@x.com'), undone)
    await service.flush()
    expect(sent).toHaveLength(1)
    expect(undone).not.toHaveBeenCalled()
  })
})
