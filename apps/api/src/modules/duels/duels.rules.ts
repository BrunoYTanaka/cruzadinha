import type { DuelStatus, MyDuelStatus } from '@cruzadinha/shared'

// Regras do duelo sem banco nem relógio próprio: tudo recebe `now` (feature 058, research R2/R12).

export type DuelRole = 'creator' | 'opponent'
export type DuelOutcome = 'creator' | 'opponent' | 'tie'
export type DuelOutcomeReason = 'time' | 'forfeit' | 'timeout' | 'walkover' | 'declined'
export type EndReason = 'completed' | 'forfeit' | 'timeout'

export type DuelRow = {
  duelId: string
  puzzleId: string
  linkToken: string
  code: string
  state: 'open' | 'running' | 'finished' | 'cancelled'
  helpMode: 'free' | 'forbidden' | 'penalty'
  helpPenaltyMs: number | null
  maxMs: number | null
  startDeadlineAt: Date
  outcome: DuelOutcome | null
  outcomeReason: DuelOutcomeReason | null
  finishedAt: Date | null
}

export type ParticipantRow = {
  duelParticipantId: string
  duelId: string
  role: DuelRole
  userId: string | null
  nickname: string
  tokenHash: string
  startedAt: Date | null
  finishedAt: Date | null
  elapsedMs: number | null
  helpsUsed: number
  penaltyMs: number
  endReason: EndReason | null
}

export type Resolution = {
  status: DuelStatus
  outcome: DuelOutcome | null
  reason: DuelOutcomeReason | null
}

// Sem tempo máximo, quem já começou tem este prazo para terminar depois do prazo de início.
export const NO_LIMIT_GRACE_MS = 6 * 60 * 60 * 1000

export const HOUR_MS = 60 * 60 * 1000

export const totalMs = (p: ParticipantRow): number | null =>
  p.endReason === 'completed' && p.elapsedMs !== null ? p.elapsedMs + p.penaltyMs : null

// Até quando o participante pode terminar: o prazo de início para quem não começou; para quem
// começou, o maior entre o prazo e o próprio tempo máximo (ou a folga, sem tempo máximo).
function dueAt(duel: DuelRow, p: ParticipantRow): Date {
  if (!p.startedAt) return duel.startDeadlineAt
  const own = p.startedAt.getTime() + (duel.maxMs ?? NO_LIMIT_GRACE_MS)
  return new Date(Math.max(duel.startDeadlineAt.getTime(), own))
}

type Side =
  | { kind: 'done'; total: number }
  | { kind: 'lost'; reason: 'forfeit' | 'timeout' }
  | { kind: 'lapsed'; reason: 'walkover' | 'timeout' }
  | { kind: 'pending' }

function sideOf(duel: DuelRow, p: ParticipantRow, now: Date): Side {
  const total = totalMs(p)
  if (total !== null) return { kind: 'done', total }
  if (p.endReason === 'forfeit' || p.endReason === 'timeout') {
    return { kind: 'lost', reason: p.endReason }
  }
  if (now.getTime() > dueAt(duel, p).getTime()) {
    const timedOut = p.startedAt !== null && duel.maxMs !== null
    return { kind: 'lapsed', reason: timedOut ? 'timeout' : 'walkover' }
  }
  return { kind: 'pending' }
}

const finished = (outcome: DuelOutcome, reason: DuelOutcomeReason): Resolution => ({
  status: 'finished',
  outcome,
  reason,
})

function judge(duel: DuelRow, creator: ParticipantRow, opponent: ParticipantRow, now: Date) {
  const c = sideOf(duel, creator, now)
  const o = sideOf(duel, opponent, now)
  if (c.kind === 'lost' && o.kind === 'lost') return finished('tie', c.reason)
  if (c.kind === 'lost') return finished('opponent', c.reason)
  if (o.kind === 'lost') return finished('creator', o.reason)
  if (c.kind === 'done' && o.kind === 'done') {
    if (c.total === o.total) return finished('tie', 'time')
    return finished(c.total < o.total ? 'creator' : 'opponent', 'time')
  }
  if (c.kind === 'done' && o.kind === 'lapsed') return finished('creator', o.reason)
  if (o.kind === 'done' && c.kind === 'lapsed') return finished('opponent', c.reason)
  if (c.kind === 'lapsed' && o.kind === 'lapsed') {
    return { status: 'expired', outcome: null, reason: null } satisfies Resolution
  }
  return { status: 'running', outcome: null, reason: null } satisfies Resolution
}

// Estado efetivo do duelo agora. Prazo vencido, W.O. e tempo esgotado saem daqui sem escrever nada.
export function resolveDuel(
  duel: DuelRow,
  participants: readonly ParticipantRow[],
  now: Date,
): Resolution {
  if (duel.state === 'cancelled') return { status: 'cancelled', outcome: null, reason: null }
  if (duel.state === 'finished') {
    return { status: 'finished', outcome: duel.outcome, reason: duel.outcomeReason }
  }
  const creator = participants.find((p) => p.role === 'creator')
  const opponent = participants.find((p) => p.role === 'opponent')
  if (!opponent || !creator) {
    const expired = now.getTime() > duel.startDeadlineAt.getTime()
    return { status: expired ? 'expired' : 'open', outcome: null, reason: null }
  }
  return judge(duel, creator, opponent, now)
}

export function myStatus(
  resolution: Resolution,
  p: ParticipantRow,
  now: Date,
  duel: DuelRow,
): MyDuelStatus {
  if (resolution.status === 'finished' || resolution.status === 'cancelled') return 'done'
  if (resolution.status === 'expired') return 'done'
  if (p.endReason === 'completed') return 'waiting-other'
  if (p.endReason) return 'done'
  if (!p.startedAt) return 'not-started'
  return now.getTime() > dueAt(duel, p).getTime() ? 'done' : 'playing'
}

export function opponentStatus(
  other: ParticipantRow | undefined,
): 'not-joined' | 'not-started' | 'playing' | 'done' {
  if (!other) return 'not-joined'
  if (other.endReason) return 'done'
  return other.startedAt ? 'playing' : 'not-started'
}

export type FinishDecision = {
  endReason: 'completed' | 'timeout'
  elapsedMs: number
  penaltyMs: number
}

// Tempo do servidor desde o "Começar"; passar do tempo máximo é "tempo esgotado" e perde. As ajudas
// são as declaradas pelo cliente (dívida aceita) e só valem como penalidade no modo `penalty`.
export function decideFinish(
  duel: DuelRow,
  p: ParticipantRow,
  now: Date,
  helpsUsed: number,
): FinishDecision {
  if (!p.startedAt) throw new Error('participante não começou')
  const elapsedMs = Math.max(0, now.getTime() - p.startedAt.getTime())
  const penaltyMs = duel.helpMode === 'penalty' ? helpsUsed * (duel.helpPenaltyMs ?? 0) : 0
  const timedOut = duel.maxMs !== null && elapsedMs > duel.maxMs
  return { endReason: timedOut ? 'timeout' : 'completed', elapsedMs, penaltyMs }
}

// Diferença mostrada no resultado: só quando decidiu pelo tempo.
export function diffMs(
  a: ParticipantRow | undefined,
  b: ParticipantRow | undefined,
  reason: DuelOutcomeReason | null,
): number | null {
  if (reason !== 'time' || !a || !b) return null
  const ta = totalMs(a)
  const tb = totalMs(b)
  return ta === null || tb === null ? null : Math.abs(ta - tb)
}
