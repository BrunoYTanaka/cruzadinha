import { and, eq, isNull, lt, or } from 'drizzle-orm'
import type { Executor } from '../../../db/client'
import { sessions, users } from '../../../db/schema'

export async function createSession(
  db: Executor,
  values: { userId: string; tokenHash: string; expiresAt: Date; absoluteExpiresAt: Date },
): Promise<void> {
  await db.insert(sessions).values(values)
}

export type SessionWithUser = {
  sessionId: string
  expiresAt: Date
  absoluteExpiresAt: Date
  endedAt: Date | null
  userId: string
  email: string
}

export async function findSessionByTokenHash(
  db: Executor,
  tokenHash: string,
): Promise<SessionWithUser | undefined> {
  const [row] = await db
    .select({
      sessionId: sessions.sessionId,
      expiresAt: sessions.expiresAt,
      absoluteExpiresAt: sessions.absoluteExpiresAt,
      endedAt: sessions.endedAt,
      userId: users.userId,
      email: users.email,
    })
    .from(sessions)
    .innerJoin(users, eq(users.userId, sessions.userId))
    .where(eq(sessions.tokenHash, tokenHash))
  return row
}

export async function renewSession(
  db: Executor,
  sessionId: string,
  expiresAt: Date,
): Promise<void> {
  await db.update(sessions).set({ expiresAt }).where(eq(sessions.sessionId, sessionId))
}

export async function endSessionByTokenHash(
  db: Executor,
  tokenHash: string,
  now: Date,
): Promise<void> {
  await db
    .update(sessions)
    .set({ endedAt: now })
    .where(and(eq(sessions.tokenHash, tokenHash), isNull(sessions.endedAt)))
}

// Encerra todas as sessões abertas do usuário (redefinição de senha, feature 035).
export async function endAllSessionsForUser(
  db: Executor,
  userId: string,
  now: Date,
): Promise<void> {
  await db
    .update(sessions)
    .set({ endedAt: now })
    .where(and(eq(sessions.userId, userId), isNull(sessions.endedAt)))
}

const ENDED_RETENTION_MS = 7 * 24 * 60 * 60 * 1000

// Sessão vencida não volta a valer; a encerrada fica 7 dias e sai. O banco garante
// `expires_at <= absolute_expires_at` (sessions_expiry_within_absolute), então `expires_at` passado
// já cobre o limite absoluto. Devolve quantas linhas apagou.
export async function deleteStaleSessions(db: Executor, now: Date): Promise<number> {
  const deleted = await db
    .delete(sessions)
    .where(
      or(
        lt(sessions.expiresAt, now),
        lt(sessions.endedAt, new Date(now.getTime() - ENDED_RETENTION_MS)),
      ),
    )
    .returning({ sessionId: sessions.sessionId })
  return deleted.length
}
