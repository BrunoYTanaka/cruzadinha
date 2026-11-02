import { and, eq, gt, inArray, isNotNull, lt, or, sql } from 'drizzle-orm'
import type { Executor } from '../../platform/db/client'
import { duelParticipants, duels, puzzles } from '../../platform/db/schema'
import type { DuelRow, ParticipantRow } from './duels.rules'

// SQL do duelo fica aqui. Nenhuma coluna de regra usa `now()` do banco: o serviço passa o instante do
// Clock (feature 058, research R12).

export type NewDuel = Omit<DuelRow, 'duelId' | 'outcome' | 'outcomeReason' | 'finishedAt'>

export type NewParticipant = Pick<
  ParticipantRow,
  'duelId' | 'role' | 'userId' | 'nickname' | 'tokenHash'
> & { startedAt?: Date | null }

export type PuzzleInfo = {
  puzzleId: string
  source: (typeof puzzles.$inferSelect)['source']
  date: string
}

export type ParticipantPatch = Partial<
  Pick<
    ParticipantRow,
    'startedAt' | 'finishedAt' | 'elapsedMs' | 'helpsUsed' | 'penaltyMs' | 'endReason'
  >
>

export type DuelPatch = Partial<Pick<DuelRow, 'state' | 'outcome' | 'outcomeReason' | 'finishedAt'>>

const toDuel = (row: typeof duels.$inferSelect): DuelRow => ({
  duelId: row.duelId,
  puzzleId: row.puzzleId,
  linkToken: row.linkToken,
  code: row.code,
  state: row.state,
  helpMode: row.helpMode,
  helpPenaltyMs: row.helpPenaltyMs,
  maxMs: row.maxMs,
  startDeadlineAt: row.startDeadlineAt,
  outcome: row.outcome,
  outcomeReason: row.outcomeReason,
  finishedAt: row.finishedAt,
})

const toParticipant = (row: typeof duelParticipants.$inferSelect): ParticipantRow => ({
  duelParticipantId: row.duelParticipantId,
  duelId: row.duelId,
  role: row.role,
  userId: row.userId,
  nickname: row.nickname,
  tokenHash: row.tokenHash,
  startedAt: row.startedAt,
  finishedAt: row.finishedAt,
  elapsedMs: row.elapsedMs,
  helpsUsed: row.helpsUsed,
  penaltyMs: row.penaltyMs,
  endReason: row.endReason,
})

export async function findPuzzleInfo(
  db: Executor,
  puzzleId: string,
): Promise<PuzzleInfo | undefined> {
  const [row] = await db
    .select({ puzzleId: puzzles.puzzleId, source: puzzles.source, date: puzzles.date })
    .from(puzzles)
    .where(eq(puzzles.puzzleId, puzzleId))
  return row
}

export async function insertDuel(db: Executor, values: NewDuel): Promise<DuelRow> {
  const [row] = await db.insert(duels).values(values).returning()
  if (!row) throw new Error('duelo não criado')
  return toDuel(row)
}

export async function insertParticipant(
  db: Executor,
  values: NewParticipant,
): Promise<ParticipantRow> {
  const [row] = await db.insert(duelParticipants).values(values).returning()
  if (!row) throw new Error('participante não criado')
  return toParticipant(row)
}

export async function findDuelByLinkToken(
  db: Executor,
  linkToken: string,
): Promise<DuelRow | undefined> {
  const [row] = await db.select().from(duels).where(eq(duels.linkToken, linkToken))
  return row ? toDuel(row) : undefined
}

// Só duelos abertos são achados pelo código.
export async function findOpenDuelByCode(db: Executor, code: string): Promise<DuelRow | undefined> {
  const [row] = await db
    .select()
    .from(duels)
    .where(and(eq(duels.code, code), eq(duels.state, 'open')))
  return row ? toDuel(row) : undefined
}

// Trava o duelo até o fim da transação: "Começar", terminar e desistir se serializam.
export async function lockDuelByLinkToken(
  db: Executor,
  linkToken: string,
): Promise<DuelRow | undefined> {
  const [row] = await db.select().from(duels).where(eq(duels.linkToken, linkToken)).for('update')
  return row ? toDuel(row) : undefined
}

export async function lockDuelById(db: Executor, duelId: string): Promise<DuelRow | undefined> {
  const [row] = await db.select().from(duels).where(eq(duels.duelId, duelId)).for('update')
  return row ? toDuel(row) : undefined
}

export async function listParticipants(db: Executor, duelId: string): Promise<ParticipantRow[]> {
  const rows = await db.select().from(duelParticipants).where(eq(duelParticipants.duelId, duelId))
  return rows.map(toParticipant)
}

export async function updateDuel(db: Executor, duelId: string, patch: DuelPatch): Promise<void> {
  await db.update(duels).set(patch).where(eq(duels.duelId, duelId))
}

export async function updateParticipant(
  db: Executor,
  duelParticipantId: string,
  patch: ParticipantPatch,
): Promise<void> {
  await db
    .update(duelParticipants)
    .set(patch)
    .where(eq(duelParticipants.duelParticipantId, duelParticipantId))
}

// Duelos de uma conta que ainda contam para o teto: abertos ou em andamento com prazo de início
// ainda valendo, criados por ela.
export async function countActiveCreatedByUser(
  db: Executor,
  userId: string,
  now: Date,
): Promise<number> {
  const [row] = await db
    .select({ total: sql<number>`count(*)::int` })
    .from(duelParticipants)
    .innerJoin(duels, eq(duels.duelId, duelParticipants.duelId))
    .where(
      and(
        eq(duelParticipants.userId, userId),
        eq(duelParticipants.role, 'creator'),
        inArray(duels.state, ['open', 'running']),
        gt(duels.startDeadlineAt, now),
      ),
    )
  return row?.total ?? 0
}

export type MineRow = {
  duel: DuelRow
  participants: ParticipantRow[]
  source: PuzzleInfo['source']
  date: string
}

async function loadRows(db: Executor, duelIds: string[]): Promise<MineRow[]> {
  if (duelIds.length === 0) return []
  const duelRows = await db
    .select({ duel: duels, source: puzzles.source, date: puzzles.date })
    .from(duels)
    .innerJoin(puzzles, eq(puzzles.puzzleId, duels.puzzleId))
    .where(inArray(duels.duelId, duelIds))
  const people = await db
    .select()
    .from(duelParticipants)
    .where(inArray(duelParticipants.duelId, duelIds))
  return duelRows.map((r) => ({
    duel: toDuel(r.duel),
    source: r.source,
    date: r.date,
    participants: people.filter((p) => p.duelId === r.duel.duelId).map(toParticipant),
  }))
}

export async function listDuelsForUser(db: Executor, userId: string): Promise<MineRow[]> {
  const ids = await db
    .select({ id: duelParticipants.duelId })
    .from(duelParticipants)
    .where(and(eq(duelParticipants.userId, userId), isNotNull(duelParticipants.userId)))
  return loadRows(
    db,
    ids.map((r) => r.id),
  )
}

export async function listDuelsForTokenHashes(
  db: Executor,
  tokenHashes: string[],
): Promise<MineRow[]> {
  if (tokenHashes.length === 0) return []
  const ids = await db
    .select({ id: duelParticipants.duelId })
    .from(duelParticipants)
    .where(or(...tokenHashes.map((hash) => eq(duelParticipants.tokenHash, hash))))
  return loadRows(
    db,
    ids.map((r) => r.id),
  )
}

// Limpeza (research R8): expirados, nunca `finished`. Os participantes caem em cascata.
export async function deleteExpiredDuels(db: Executor, now: Date): Promise<number> {
  const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
  const monthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)
  const noneFinished = sql`NOT EXISTS (SELECT 1 FROM duel_participants p WHERE p.duel_id = ${duels.duelId} AND p.end_reason IS NOT NULL)`
  const rows = await db
    .delete(duels)
    .where(
      or(
        and(
          inArray(duels.state, ['open', 'running']),
          lt(duels.startDeadlineAt, weekAgo),
          noneFinished,
        ),
        and(eq(duels.state, 'cancelled'), lt(duels.finishedAt, monthAgo)),
      ),
    )
    .returning({ id: duels.duelId })
  return rows.length
}
