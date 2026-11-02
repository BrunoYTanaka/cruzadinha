import { afterAll, beforeEach, describe, expect, it } from 'vitest'
import { runCli } from '../cli/run-cli'
import {
  passwordResetTokens,
  pendingRegistrations,
  rateLimitAttempts,
  users,
} from '../platform/db/schema'
import { DAY, openTestDatabase, testClock, truncateAll, type TestClock } from './database'

const handle = openTestDatabase()
const { db } = handle

let clock: TestClock
let out: string
let err: string

beforeEach(async () => {
  await truncateAll(db)
  clock = testClock()
  out = ''
  err = ''
})
afterAll(() => handle.close())

function cli(...argv: string[]): Promise<number> {
  return runCli(argv, {
    db,
    clock: clock.now,
    sources: [],
    historyDays: 0,
    readSecret: async () => '',
    stdout: (text) => {
      out += text
    },
    stderr: (text) => {
      err += text
    },
  })
}

const ago = (days: number) => new Date(clock.now().getTime() - days * DAY)

describe('auth cleanup', () => {
  it('apaga o que venceu há mais de 7 dias e guarda o resto', async () => {
    const [user] = await db
      .insert(users)
      .values({ email: 'ana@exemplo.com', passwordHash: 'hash' })
      .returning({ userId: users.userId })
    const userId = user?.userId ?? ''

    await db.insert(pendingRegistrations).values([
      {
        email: 'velha@x.com',
        tokenHash: 'p1',
        expiresAt: ago(8),
      },
      {
        email: 'recente@x.com',
        tokenHash: 'p2',
        expiresAt: ago(6),
      },
    ])
    await db.insert(passwordResetTokens).values([
      { userId, tokenHash: 't1', expiresAt: ago(8), usedAt: ago(9) },
      { userId, tokenHash: 't2', expiresAt: ago(1), usedAt: ago(8) },
      { userId, tokenHash: 't3', expiresAt: ago(6), usedAt: ago(6) },
      { userId, tokenHash: 't4', expiresAt: new Date(clock.now().getTime() + DAY) },
    ])
    await db.insert(rateLimitAttempts).values([
      { action: 'EMAIL_SENT', keyType: 'GLOBAL', keyValue: 'email', createdAt: ago(3) },
      { action: 'EMAIL_SENT', keyType: 'GLOBAL', keyValue: 'email', createdAt: ago(1) },
      { action: 'LOGIN', keyType: 'EMAIL', keyValue: 'x@x.com', createdAt: ago(3) },
    ])

    expect(await cli('auth', 'cleanup')).toBe(0)
    expect(out).toBe(
      'Limpeza: 1 pendências, 2 tokens de recuperação, 0 trocas de e-mail, 2 contagens de tentativas.\nDuelos apagados: 0.\n',
    )
    expect(err).toBe('')

    expect((await db.select().from(pendingRegistrations)).map((row) => row.tokenHash)).toEqual([
      'p2',
    ])
    expect(
      (await db.select().from(passwordResetTokens)).map((row) => row.tokenHash).sort(),
    ).toEqual(['t3', 't4'])
    // Qualquer ação some depois de 2 dias; só a de 1 dia fica.
    expect(await db.select().from(rateLimitAttempts)).toHaveLength(1)
  })

  it('não faz nada numa base limpa', async () => {
    expect(await cli('auth', 'cleanup')).toBe(0)
    expect(out).toContain('0 pendências')
  })

  it('recusa argumentos soltos', async () => {
    expect(await cli('auth', 'cleanup', '--tudo')).toBe(2)
  })
})

describe('auth cleanup de duelos', () => {
  it('apaga os expirados e guarda os finalizados', async () => {
    const { insertPuzzleIfAbsent } = await import('../modules/puzzles/puzzles.repository')
    const { okResult } = await import('./fake-source')
    const { duels, duelParticipants } = await import('../platform/db/schema')
    const ok = okResult('2026-10-01')
    const { puzzleId } = await insertPuzzleIfAbsent(db, {
      puzzle: ok.puzzle,
      solution: ok.solution,
    })
    const base = {
      puzzleId,
      helpMode: 'free' as const,
      state: 'open' as const,
    }
    const make = async (
      key: string,
      patch: Partial<typeof duels.$inferInsert>,
      withParticipant = false,
    ) => {
      const [row] = await db
        .insert(duels)
        .values({
          ...base,
          linkToken: `link-${key}`,
          code: key.padEnd(8, 'A'),
          startDeadlineAt: ago(8),
          ...patch,
        })
        .returning({ duelId: duels.duelId })
      if (withParticipant && row) {
        await db.insert(duelParticipants).values({
          duelId: row.duelId,
          role: 'creator',
          nickname: 'Ana',
          tokenHash: `hash-${key}`,
        })
      }
    }
    await make('OLDOPEN', {}, true)
    await make('NEWOPEN', { startDeadlineAt: ago(-1) })
    await make('OLDFIN', { state: 'finished', outcome: 'creator', outcomeReason: 'forfeit' })
    await make('OLDCAN', { state: 'cancelled', finishedAt: ago(31) })
    await make('NEWCAN', { state: 'cancelled', finishedAt: ago(1) })

    expect(await cli('auth', 'cleanup')).toBe(0)
    expect(out).toContain('Duelos apagados: 2.')
    const left = await db.select({ token: duels.linkToken }).from(duels)
    expect(left.map((r) => r.token).sort()).toEqual(['link-NEWCAN', 'link-NEWOPEN', 'link-OLDFIN'])
    expect(await db.select().from(duelParticipants)).toHaveLength(0)
  })
})
