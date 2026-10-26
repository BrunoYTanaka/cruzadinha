import { and, eq, lt, or } from 'drizzle-orm'
import type { Executor } from '../../db/client'
import { passwordResetTokens, pendingRegistrations, rateLimitAttempts } from '../../db/schema'

const DAY_MS = 24 * 60 * 60 * 1000
// Pendências e tokens ficam uma semana depois de vencer ou ser usados, para um suporte ver o que
// houve; as tentativas de envio só servem às janelas de 24 horas.
const KEEP_TOKENS_DAYS = 7
const KEEP_SENDS_DAYS = 2

export type CleanupCounts = { pending: number; resetTokens: number; emailSends: number }

export async function deleteExpiredAuthRows(db: Executor, now: Date): Promise<CleanupCounts> {
  const tokenLimit = new Date(now.getTime() - KEEP_TOKENS_DAYS * DAY_MS)
  const sendLimit = new Date(now.getTime() - KEEP_SENDS_DAYS * DAY_MS)

  const pending = await db
    .delete(pendingRegistrations)
    .where(lt(pendingRegistrations.expiresAt, tokenLimit))
    .returning({ id: pendingRegistrations.pendingId })
  const resetTokens = await db
    .delete(passwordResetTokens)
    .where(
      or(lt(passwordResetTokens.expiresAt, tokenLimit), lt(passwordResetTokens.usedAt, tokenLimit)),
    )
    .returning({ id: passwordResetTokens.tokenId })
  const emailSends = await db
    .delete(rateLimitAttempts)
    .where(
      and(eq(rateLimitAttempts.action, 'EMAIL_SENT'), lt(rateLimitAttempts.createdAt, sendLimit)),
    )
    .returning({ id: rateLimitAttempts.rateLimitAttemptId })

  return { pending: pending.length, resetTokens: resetTokens.length, emailSends: emailSends.length }
}
