import type {
  CreateDuelRequest,
  CreateDuelResponse,
  DuelRefRequest,
  DuelStateResponse,
  DuelSummary,
  DuelView,
  FinishDuelRequest,
  LookupDuelRequest,
  LookupDuelResponse,
  StartDuelResponse,
} from '@cruzadinha/shared'
import type { Database, Executor } from '../../platform/db/client'
import { isUniqueViolation } from '../../platform/db/errors'
import type { Clock } from '../../platform/lib/clock'
import type { RateLimiter, RateLimits } from '../../platform/rate-limit'
import { hashToken, newCode, newLinkToken, newParticipantToken } from './duel-codes'
import {
  countActiveCreatedByUser,
  findDuelByLinkToken,
  findOpenDuelByCode,
  findPuzzleInfo,
  insertDuel,
  insertParticipant,
  listDuelsForTokenHashes,
  listDuelsForUser,
  listParticipants,
  lockDuelByLinkToken,
  lockDuelById,
  updateDuel,
  updateParticipant,
  type MineRow,
  type PuzzleInfo,
} from './duels.repository'
import {
  decideFinish,
  diffMs,
  HOUR_MS,
  myStatus,
  opponentStatus,
  resolveDuel,
  type DuelRow,
  type ParticipantRow,
  type Resolution,
} from './duels.rules'

// Teto de duelos abertos por conta (feature 058, research R1). Visitantes não têm identidade
// estável: ficam sob o limite de criações por endereço.
export const MAX_OPEN_DUELS = 5
const RESULT_WINDOW_MS = 24 * HOUR_MS

export type Actor = { userId: string | null; participantToken?: string }

export type Failure =
  | { ok: false; reason: 'too-many-attempts'; retryAfterSeconds: number }
  | { ok: false; reason: 'not-found' | 'duel-taken' | 'not-running' | 'not-open' }
  | { ok: false; reason: 'puzzle-unavailable' | 'open-limit' }

type Result<T> = ({ ok: true } & T) | Failure
type NotFound = { ok: false; reason: 'not-found' }

export type DuelsService = {
  create(
    actor: Actor,
    address: string,
    input: CreateDuelRequest,
  ): Promise<Result<{ body: CreateDuelResponse }>>
  lookup(address: string, input: LookupDuelRequest): Promise<Result<{ body: LookupDuelResponse }>>
  start(
    actor: Actor,
    input: { linkToken: string; nickname: string },
  ): Promise<Result<{ body: StartDuelResponse }>>
  decline(actor: Actor, input: DuelRefRequest): Promise<Result<object>>
  state(actor: Actor, input: DuelRefRequest): Promise<Result<{ body: DuelStateResponse }>>
  finish(actor: Actor, input: FinishDuelRequest): Promise<Result<{ duel: DuelView }>>
  forfeit(actor: Actor, input: DuelRefRequest): Promise<Result<{ duel: DuelView }>>
  cancel(actor: Actor, input: DuelRefRequest): Promise<Result<{ duel: DuelView }>>
  mine(actor: Actor, address: string, tokens: string[]): Promise<Result<{ duels: DuelSummary[] }>>
}

export type DuelsDeps = {
  db: Database
  clock: Clock
  rateLimiter: RateLimiter
  limits: Pick<RateLimits, 'duelCreate' | 'duelLookup' | 'duelMine'>
}

const iso = (date: Date) => date.toISOString()

function identify(
  participants: readonly ParticipantRow[],
  actor: Actor,
): ParticipantRow | undefined {
  if (actor.userId) {
    const byUser = participants.find((p) => p.userId === actor.userId)
    if (byUser) return byUser
  }
  if (actor.participantToken) {
    const hash = hashToken(actor.participantToken)
    return participants.find((p) => p.tokenHash === hash)
  }
  return undefined
}

function sideResult(p: ParticipantRow) {
  return {
    nickname: p.nickname,
    endReason: p.endReason,
    elapsedMs: p.elapsedMs,
    penaltyMs: p.penaltyMs,
    helpsUsed: p.helpsUsed,
  }
}

// O tempo do outro só aparece quando o duelo terminou (FR-024): antes disso, só a fase.
function buildView(
  duel: DuelRow,
  info: Pick<PuzzleInfo, 'source' | 'date'>,
  participants: readonly ParticipantRow[],
  viewer: ParticipantRow,
  resolution: Resolution,
  now: Date,
): DuelView {
  const other = participants.find((p) => p.role !== viewer.role)
  const result =
    resolution.status === 'finished' && resolution.outcome && resolution.reason
      ? {
          verdict:
            resolution.outcome === 'tie'
              ? ('tie' as const)
              : resolution.outcome === viewer.role
                ? ('won' as const)
                : ('lost' as const),
          reason: resolution.reason,
          diffMs: diffMs(viewer, other, resolution.reason),
          me: sideResult(viewer),
          opponent: other ? sideResult(other) : null,
        }
      : null
  return {
    duelId: duel.duelId,
    linkToken: duel.linkToken,
    ...(viewer.role === 'creator' && resolution.status === 'open' ? { code: duel.code } : {}),
    role: viewer.role,
    status: resolution.status,
    myStatus: myStatus(resolution, viewer, now, duel),
    opponentStatus: opponentStatus(other),
    source: info.source,
    puzzleDate: info.date,
    rules: {
      helpMode: duel.helpMode,
      helpPenaltyMs: duel.helpPenaltyMs,
      maxMs: duel.maxMs,
      startDeadlineAt: iso(duel.startDeadlineAt),
    },
    me: { nickname: viewer.nickname, startedAt: viewer.startedAt ? iso(viewer.startedAt) : null },
    opponentNickname: other?.nickname ?? null,
    result,
  }
}

export function createDuelsService(deps: DuelsDeps): DuelsService {
  const { db, clock, rateLimiter, limits } = deps

  async function admit(
    action: 'DUEL_CREATE' | 'DUEL_LOOKUP' | 'DUEL_MINE',
    window: RateLimits['duelCreate'],
    address: string,
    userId: string | null,
    now: Date,
  ) {
    const parts = [
      { key: { action, keyType: 'NETWORK_ADDRESS', keyValue: address } as const, window },
      ...(userId ? [{ key: { action, keyType: 'USER', keyValue: userId } as const, window }] : []),
    ]
    const reservation = await rateLimiter.reserve(parts, now)
    return reservation.allowed
      ? null
      : ({
          ok: false,
          reason: 'too-many-attempts',
          retryAfterSeconds: reservation.retryAfterSeconds,
        } as const)
  }

  // Grava o desfecho que a leitura já mostrava (W.O., tempo esgotado, desistência), com a linha
  // travada. A resposta é a mesma com ou sem essa escrita.
  async function settle(tx: Executor, duel: DuelRow, participants: ParticipantRow[], now: Date) {
    const resolution = resolveDuel(duel, participants, now)
    if (resolution.status === 'finished' && duel.state !== 'finished') {
      await updateDuel(tx, duel.duelId, {
        state: 'finished',
        outcome: resolution.outcome,
        outcomeReason: resolution.reason,
        finishedAt: now,
      })
      return {
        duel: {
          ...duel,
          state: 'finished' as const,
          outcome: resolution.outcome,
          outcomeReason: resolution.reason,
          finishedAt: now,
        },
        resolution,
      }
    }
    return { duel, resolution }
  }

  // Abre a transação, trava o duelo e resolve quem pergunta; `null` quando não é participante.
  async function withParticipant<T>(
    actor: Actor,
    linkToken: string,
    run: (ctx: {
      tx: Executor
      duel: DuelRow
      participants: ParticipantRow[]
      viewer: ParticipantRow
      resolution: Resolution
      info: PuzzleInfo
      now: Date
    }) => Promise<Result<T>>,
  ): Promise<Result<T>> {
    const now = clock()
    return db.transaction(async (tx) => {
      const locked = await lockDuelByLinkToken(tx, linkToken)
      if (!locked) return { ok: false, reason: 'not-found' } satisfies NotFound
      const participants = await listParticipants(tx, locked.duelId)
      const viewer = identify(participants, actor)
      if (!viewer) return { ok: false, reason: 'not-found' } satisfies NotFound
      const info = await findPuzzleInfo(tx, locked.puzzleId)
      if (!info) return { ok: false, reason: 'not-found' } satisfies NotFound
      const { duel, resolution } = await settle(tx, locked, participants, now)
      return run({ tx, duel, participants, viewer, resolution, info, now })
    })
  }

  return {
    async create(actor, address, input) {
      const now = clock()
      const throttled = await admit('DUEL_CREATE', limits.duelCreate, address, actor.userId, now)
      if (throttled) return throttled
      const info = await findPuzzleInfo(db, input.puzzleId)
      if (!info) return { ok: false, reason: 'puzzle-unavailable' }
      if (
        actor.userId &&
        (await countActiveCreatedByUser(db, actor.userId, now)) >= MAX_OPEN_DUELS
      ) {
        return { ok: false, reason: 'open-limit' }
      }
      const participantToken = newParticipantToken()
      for (let attempt = 0; ; attempt += 1) {
        try {
          return await db.transaction(async (tx) => {
            const duel = await insertDuel(tx, {
              puzzleId: input.puzzleId,
              linkToken: newLinkToken(),
              code: newCode(),
              state: 'open',
              helpMode: input.rules.helpMode,
              helpPenaltyMs: input.rules.helpMode === 'penalty' ? input.rules.helpPenaltyMs : null,
              maxMs: input.rules.maxMs,
              startDeadlineAt: new Date(now.getTime() + input.rules.startDeadlineHours * HOUR_MS),
            })
            const creator = await insertParticipant(tx, {
              duelId: duel.duelId,
              role: 'creator',
              userId: actor.userId,
              nickname: input.nickname,
              tokenHash: hashToken(participantToken),
            })
            const resolution = resolveDuel(duel, [creator], now)
            return {
              ok: true as const,
              body: {
                linkToken: duel.linkToken,
                code: duel.code,
                ...(actor.userId ? {} : { participantToken }),
                duel: buildView(duel, info, [creator], creator, resolution, now),
              },
            }
          })
        } catch (error) {
          // Código ou token repetido: sorteia de novo (quase impossível, mas barato).
          if (isUniqueViolation(error) && attempt < 3) continue
          throw error
        }
      }
    },

    async lookup(address, input) {
      const now = clock()
      const throttled = await admit('DUEL_LOOKUP', limits.duelLookup, address, null, now)
      if (throttled) return throttled
      // Leitura pura: nada é gravado, nem por pré-visualização de mensageiro.
      const duel =
        'code' in input
          ? await findOpenDuelByCode(db, input.code)
          : await findDuelByLinkToken(db, input.linkToken)
      if (!duel) return { ok: false, reason: 'not-found' }
      const participants = await listParticipants(db, duel.duelId)
      const creator = participants.find((p) => p.role === 'creator')
      const info = await findPuzzleInfo(db, duel.puzzleId)
      if (!creator || !info || resolveDuel(duel, participants, now).status !== 'open') {
        return { ok: false, reason: 'not-found' }
      }
      return {
        ok: true,
        body: {
          linkToken: duel.linkToken,
          rules: {
            helpMode: duel.helpMode,
            helpPenaltyMs: duel.helpPenaltyMs,
            maxMs: duel.maxMs,
            startDeadlineAt: iso(duel.startDeadlineAt),
          },
          source: info.source,
          puzzleDate: info.date,
          creatorNickname: creator.nickname,
        },
      }
    },

    async start(actor, input) {
      const now = clock()
      return db.transaction(async (tx): Promise<Result<{ body: StartDuelResponse }>> => {
        const locked = await lockDuelByLinkToken(tx, input.linkToken)
        if (!locked) return { ok: false, reason: 'not-found' }
        const participants = await listParticipants(tx, locked.duelId)
        const info = await findPuzzleInfo(tx, locked.puzzleId)
        if (!info) return { ok: false, reason: 'not-found' }
        const { duel, resolution } = await settle(tx, locked, participants, now)
        const viewer = identify(participants, actor)
        const reply = (
          current: ParticipantRow,
          all: ParticipantRow[],
          res: Resolution,
          token?: string,
        ): Result<{ body: StartDuelResponse }> => ({
          ok: true,
          body: {
            ...(token ? { participantToken: token } : {}),
            duel: buildView(duel, info, all, current, res, now),
            puzzleId: duel.puzzleId,
            startedAt: iso(current.startedAt ?? now),
            serverNow: iso(now),
          },
        })

        if (viewer) {
          if (resolution.status !== 'open' && resolution.status !== 'running') {
            return { ok: false, reason: 'not-open' }
          }
          if (viewer.startedAt) return reply(viewer, participants, resolution)
          await updateParticipant(tx, viewer.duelParticipantId, { startedAt: now })
          const started = { ...viewer, startedAt: now }
          const all = participants.map((p) => (p === viewer ? started : p))
          return reply(started, all, resolveDuel(duel, all, now))
        }

        if (
          resolution.status === 'running' ||
          (resolution.status === 'finished' && participants.length > 1)
        ) {
          return { ok: false, reason: 'duel-taken' }
        }
        if (resolution.status !== 'open') return { ok: false, reason: 'not-found' }
        // Vaga do oponente: a trava do duelo serializa os "Começar", só um passa.
        const token = newParticipantToken()
        const opponent = await insertParticipant(tx, {
          duelId: duel.duelId,
          role: 'opponent',
          userId: actor.userId,
          nickname: input.nickname,
          tokenHash: hashToken(token),
          startedAt: now,
        })
        await updateDuel(tx, duel.duelId, { state: 'running' })
        const running = { ...duel, state: 'running' as const }
        const all = [...participants, opponent]
        return reply(
          opponent,
          all,
          resolveDuel(running, all, now),
          actor.userId ? undefined : token,
        )
      })
    },

    async decline(actor, input) {
      const now = clock()
      return db.transaction(async (tx): Promise<Result<object>> => {
        const locked = await lockDuelByLinkToken(tx, input.linkToken)
        if (!locked) return { ok: false, reason: 'not-found' }
        const participants = await listParticipants(tx, locked.duelId)
        if (identify(participants, actor)) return { ok: false, reason: 'not-open' }
        const { duel, resolution } = await settle(tx, locked, participants, now)
        if (resolution.status === 'running') return { ok: false, reason: 'duel-taken' }
        if (resolution.status !== 'open') return { ok: false, reason: 'not-found' }
        await updateDuel(tx, duel.duelId, {
          state: 'finished',
          outcome: 'creator',
          outcomeReason: 'declined',
          finishedAt: now,
        })
        return { ok: true }
      })
    },

    async state(actor, input) {
      return withParticipant<{ body: DuelStateResponse }>(
        actor,
        input.linkToken,
        async ({ duel, participants, viewer, resolution, info, now }) => {
          const playing =
            viewer.startedAt &&
            !viewer.endReason &&
            (resolution.status === 'open' || resolution.status === 'running')
          return {
            ok: true,
            body: {
              duel: buildView(duel, info, participants, viewer, resolution, now),
              ...(playing ? { puzzleId: duel.puzzleId } : {}),
              serverNow: iso(now),
            },
          }
        },
      )
    },

    async finish(actor, input) {
      return withParticipant<{ duel: DuelView }>(actor, input.linkToken, async (ctx) => {
        const { tx, duel, participants, viewer, resolution, info, now } = ctx
        const live = resolution.status === 'open' || resolution.status === 'running'
        if (!live || !viewer.startedAt || viewer.endReason)
          return { ok: false, reason: 'not-running' }
        const decision = decideFinish(duel, viewer, now, input.helpsUsed)
        const patch = {
          finishedAt: now,
          elapsedMs: decision.elapsedMs,
          helpsUsed: input.helpsUsed,
          penaltyMs: decision.penaltyMs,
          endReason: decision.endReason,
        }
        await updateParticipant(tx, viewer.duelParticipantId, patch)
        const updated = { ...viewer, ...patch }
        const all = participants.map((p) => (p === viewer ? updated : p))
        const settled = await settle(tx, duel, all, now)
        return {
          ok: true,
          duel: buildView(settled.duel, info, all, updated, settled.resolution, now),
        }
      })
    },

    async forfeit(actor, input) {
      return withParticipant<{ duel: DuelView }>(actor, input.linkToken, async (ctx) => {
        const { tx, duel, participants, viewer, resolution, info, now } = ctx
        if (resolution.status === 'open') {
          // Sem oponente, desistir é abandonar o próprio desafio.
          if (viewer.role !== 'creator') return { ok: false, reason: 'not-running' }
          await updateDuel(tx, duel.duelId, { state: 'cancelled', finishedAt: now })
          const cancelled = { ...duel, state: 'cancelled' as const, finishedAt: now }
          return {
            ok: true,
            duel: buildView(
              cancelled,
              info,
              participants,
              viewer,
              resolveDuel(cancelled, participants, now),
              now,
            ),
          }
        }
        if (resolution.status !== 'running' || viewer.endReason) {
          return { ok: false, reason: 'not-running' }
        }
        const patch = { finishedAt: now, endReason: 'forfeit' as const }
        await updateParticipant(tx, viewer.duelParticipantId, patch)
        const updated = { ...viewer, ...patch }
        const all = participants.map((p) => (p === viewer ? updated : p))
        const settled = await settle(tx, duel, all, now)
        return {
          ok: true,
          duel: buildView(settled.duel, info, all, updated, settled.resolution, now),
        }
      })
    },

    async cancel(actor, input) {
      return withParticipant<{ duel: DuelView }>(actor, input.linkToken, async (ctx) => {
        const { tx, duel, participants, viewer, resolution, info, now } = ctx
        if (viewer.role !== 'creator' || resolution.status !== 'open') {
          return { ok: false, reason: 'not-open' }
        }
        await updateDuel(tx, duel.duelId, { state: 'cancelled', finishedAt: now })
        const cancelled = { ...duel, state: 'cancelled' as const, finishedAt: now }
        return {
          ok: true,
          duel: buildView(
            cancelled,
            info,
            participants,
            viewer,
            resolveDuel(cancelled, participants, now),
            now,
          ),
        }
      })
    },

    async mine(actor, address, tokens) {
      const now = clock()
      const throttled = await admit('DUEL_MINE', limits.duelMine, address, null, now)
      if (throttled) return throttled
      // A sessão vence o token: logado lista só o que é da conta.
      const rows: MineRow[] = actor.userId
        ? await listDuelsForUser(db, actor.userId)
        : await listDuelsForTokenHashes(db, tokens.map(hashToken))
      const hashes = new Set(tokens.map(hashToken))
      const duels: DuelSummary[] = []
      for (const row of rows) {
        const viewer = actor.userId
          ? row.participants.find((p) => p.userId === actor.userId)
          : row.participants.find((p) => hashes.has(p.tokenHash))
        if (!viewer) continue
        let { duel, participants } = row
        let resolution = resolveDuel(duel, participants, now)
        if (resolution.status === 'finished' && duel.state !== 'finished') {
          const settled = await db.transaction(async (tx) => {
            const locked = await lockDuelById(tx, duel.duelId)
            if (!locked) return undefined
            const fresh = await listParticipants(tx, locked.duelId)
            return { ...(await settle(tx, locked, fresh, now)), participants: fresh }
          })
          if (!settled) continue
          duel = settled.duel
          participants = settled.participants
          resolution = settled.resolution
        }
        const recent =
          resolution.status === 'finished' &&
          (duel.finishedAt === null ||
            now.getTime() - duel.finishedAt.getTime() <= RESULT_WINDOW_MS)
        const listed = resolution.status === 'open' || resolution.status === 'running' || recent
        if (!listed) continue
        const me =
          participants.find((p) => p.duelParticipantId === viewer.duelParticipantId) ?? viewer
        const mine = myStatus(resolution, me, now, duel)
        const other = participants.find((p) => p.role !== me.role)
        duels.push({
          duelId: duel.duelId,
          linkToken: duel.linkToken,
          role: me.role,
          status: resolution.status,
          myStatus: mine,
          source: row.source,
          puzzleDate: row.date,
          opponentNickname: other?.nickname ?? null,
          attention:
            (resolution.status === 'running' && (mine === 'not-started' || mine === 'playing')) ||
            resolution.status === 'finished',
        })
      }
      duels.sort(
        (a, b) =>
          Number(b.attention) - Number(a.attention) || b.puzzleDate.localeCompare(a.puzzleDate),
      )
      return { ok: true, duels }
    },
  }
}
