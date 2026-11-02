import { describe, expect, it } from 'vitest'
import {
  decideFinish,
  diffMs,
  myStatus,
  NO_LIMIT_GRACE_MS,
  opponentStatus,
  resolveDuel,
  type DuelRow,
  type ParticipantRow,
} from './duels.rules'

const T0 = new Date('2026-11-02T12:00:00.000Z')
const at = (ms: number) => new Date(T0.getTime() + ms)
const MIN = 60_000
const HOUR = 60 * MIN

const duel = (patch: Partial<DuelRow> = {}): DuelRow => ({
  duelId: 'd1',
  puzzleId: 'p1',
  linkToken: 'l',
  code: 'ABCDEFGH',
  state: 'open',
  helpMode: 'free',
  helpPenaltyMs: null,
  maxMs: null,
  startDeadlineAt: at(24 * HOUR),
  outcome: null,
  outcomeReason: null,
  finishedAt: null,
  ...patch,
})

const person = (
  role: 'creator' | 'opponent',
  patch: Partial<ParticipantRow> = {},
): ParticipantRow => ({
  duelParticipantId: role,
  duelId: 'd1',
  role,
  userId: null,
  nickname: role,
  tokenHash: role,
  startedAt: null,
  finishedAt: null,
  elapsedMs: null,
  helpsUsed: 0,
  penaltyMs: 0,
  endReason: null,
  ...patch,
})

const done = (role: 'creator' | 'opponent', elapsedMs: number, penaltyMs = 0) =>
  person(role, {
    startedAt: at(0),
    finishedAt: at(elapsedMs),
    elapsedMs,
    penaltyMs,
    endReason: 'completed',
  })

describe('resolveDuel', () => {
  it('is open until the deadline and expired after it when nobody joined', () => {
    const d = duel()
    expect(resolveDuel(d, [person('creator')], at(HOUR)).status).toBe('open')
    expect(resolveDuel(d, [person('creator')], at(24 * HOUR + 1)).status).toBe('expired')
  })

  it('expires even if the creator already finished alone', () => {
    const r = resolveDuel(duel(), [done('creator', 5 * MIN)], at(25 * HOUR))
    expect(r).toEqual({ status: 'expired', outcome: null, reason: null })
  })

  it('stays running while both can still finish', () => {
    const d = duel({ state: 'running' })
    const r = resolveDuel(
      d,
      [done('creator', 5 * MIN), person('opponent', { startedAt: at(0) })],
      at(HOUR),
    )
    expect(r.status).toBe('running')
  })

  it('lowest total wins, penalty included', () => {
    const d = duel({ state: 'running', helpMode: 'penalty', helpPenaltyMs: 30_000 })
    const r = resolveDuel(
      d,
      [done('creator', 10 * MIN, 120_000), done('opponent', 11 * MIN)],
      at(HOUR),
    )
    expect(r).toEqual({ status: 'finished', outcome: 'opponent', reason: 'time' })
  })

  it('equal totals tie', () => {
    const d = duel({ state: 'running' })
    const r = resolveDuel(d, [done('creator', 9 * MIN), done('opponent', 9 * MIN)], at(HOUR))
    expect(r).toEqual({ status: 'finished', outcome: 'tie', reason: 'time' })
  })

  it('forfeit gives the other the win at once', () => {
    const d = duel({ state: 'running' })
    const forfeit = person('opponent', {
      startedAt: at(0),
      finishedAt: at(MIN),
      endReason: 'forfeit',
    })
    const r = resolveDuel(d, [person('creator', { startedAt: at(0) }), forfeit], at(2 * MIN))
    expect(r).toEqual({ status: 'finished', outcome: 'creator', reason: 'forfeit' })
  })

  it('a timeout loses even if the other has not finished', () => {
    const d = duel({ state: 'running', maxMs: 30 * MIN })
    const late = person('creator', {
      startedAt: at(0),
      finishedAt: at(31 * MIN),
      elapsedMs: 31 * MIN,
      endReason: 'timeout',
    })
    const r = resolveDuel(d, [late, person('opponent', { startedAt: at(0) })], at(32 * MIN))
    expect(r).toEqual({ status: 'finished', outcome: 'opponent', reason: 'timeout' })
  })

  it('walkover: deadline passed with only one finished', () => {
    const d = duel({ state: 'running' })
    const waiting = [done('creator', 10 * MIN), person('opponent')]
    expect(resolveDuel(d, waiting, at(23 * HOUR)).status).toBe('running')
    expect(resolveDuel(d, waiting, at(24 * HOUR + 1))).toEqual({
      status: 'finished',
      outcome: 'creator',
      reason: 'walkover',
    })
  })

  it('does not cut a started opponent who is within the grace window', () => {
    const d = duel({ state: 'running' })
    const mid = person('opponent', { startedAt: at(23 * HOUR) })
    const r = resolveDuel(d, [done('creator', 10 * MIN), mid], at(24 * HOUR + 1))
    expect(r.status).toBe('running')
    expect(
      resolveDuel(d, [done('creator', 10 * MIN), mid], at(23 * HOUR + NO_LIMIT_GRACE_MS + 1))
        .reason,
    ).toBe('walkover')
  })

  it('started opponent who overruns the max time loses by timeout after the deadline', () => {
    const d = duel({ state: 'running', maxMs: 30 * MIN })
    const mid = person('opponent', { startedAt: at(HOUR) })
    const r = resolveDuel(d, [done('creator', 10 * MIN), mid], at(25 * HOUR))
    expect(r).toEqual({ status: 'finished', outcome: 'creator', reason: 'timeout' })
  })

  it('expires when both lapse without finishing', () => {
    const d = duel({ state: 'running' })
    const r = resolveDuel(d, [person('creator'), person('opponent')], at(25 * HOUR))
    expect(r.status).toBe('expired')
  })

  it('reads stored finished and cancelled states as they are', () => {
    const f = duel({ state: 'finished', outcome: 'creator', outcomeReason: 'declined' })
    expect(resolveDuel(f, [person('creator')], at(HOUR))).toEqual({
      status: 'finished',
      outcome: 'creator',
      reason: 'declined',
    })
    expect(resolveDuel(duel({ state: 'cancelled' }), [], at(HOUR)).status).toBe('cancelled')
  })
})

describe('decideFinish', () => {
  const started = person('creator', { startedAt: at(0) })

  it('uses the server elapsed time and no penalty outside penalty mode', () => {
    expect(decideFinish(duel(), started, at(5 * MIN), 3)).toEqual({
      endReason: 'completed',
      elapsedMs: 5 * MIN,
      penaltyMs: 0,
    })
  })

  it('adds helps × penalty in penalty mode', () => {
    const d = duel({ helpMode: 'penalty', helpPenaltyMs: 30_000 })
    expect(decideFinish(d, started, at(5 * MIN), 2).penaltyMs).toBe(60_000)
  })

  it('is a timeout above the max time and completed at exactly the max', () => {
    const d = duel({ maxMs: 30 * MIN })
    expect(decideFinish(d, started, at(30 * MIN), 0).endReason).toBe('completed')
    expect(decideFinish(d, started, at(30 * MIN + 1), 0).endReason).toBe('timeout')
  })

  it('records the helps as declared even when helps are forbidden', () => {
    expect(decideFinish(duel({ helpMode: 'forbidden' }), started, at(MIN), 5).penaltyMs).toBe(0)
  })
})

describe('statuses and diff', () => {
  it('myStatus follows the player through the duel', () => {
    const d = duel({ state: 'running' })
    const none = person('creator')
    const r = resolveDuel(d, [none, person('opponent')], at(MIN))
    expect(myStatus(r, none, at(MIN), d)).toBe('not-started')
    const playing = person('creator', { startedAt: at(0) })
    expect(myStatus(r, playing, at(MIN), d)).toBe('playing')
    const finishedOne = done('creator', MIN)
    expect(myStatus(r, finishedOne, at(MIN), d)).toBe('waiting-other')
  })

  it('opponentStatus never exposes more than the phase', () => {
    expect(opponentStatus(undefined)).toBe('not-joined')
    expect(opponentStatus(person('opponent'))).toBe('not-started')
    expect(opponentStatus(person('opponent', { startedAt: at(0) }))).toBe('playing')
    expect(opponentStatus(done('opponent', MIN))).toBe('done')
  })

  it('diff is the absolute difference of totals only for a time decision', () => {
    expect(diffMs(done('creator', 10 * MIN), done('opponent', 11 * MIN), 'time')).toBe(MIN)
    expect(diffMs(done('creator', 10 * MIN), done('opponent', 11 * MIN), 'forfeit')).toBeNull()
  })
})
