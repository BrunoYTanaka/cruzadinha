import { lt, or } from 'drizzle-orm'
import type { Executor } from '../../platform/db/client'
import {
  emailChangeRequests,
  passwordResetTokens,
  pendingRegistrations,
  rateLimitAttempts,
} from '../../platform/db/schema'

const DAY_MS = 24 * 60 * 60 * 1000
// Pendências e tokens ficam uma semana depois de vencer ou ser usados, para um suporte ver o que
// houve; as tentativas dos limites só servem às janelas (a maior é de 24 horas).
const KEEP_TOKENS_DAYS = 7
const KEEP_ATTEMPTS_DAYS = 2

export type CleanupCounts = {
  pending: number
  resetTokens: number
  emailChanges: number
  attempts: number
}

export async function deleteExpiredAuthRows(db: Executor, now: Date): Promise<CleanupCounts> {
  const tokenLimit = new Date(now.getTime() - KEEP_TOKENS_DAYS * DAY_MS)
  const attemptLimit = new Date(now.getTime() - KEEP_ATTEMPTS_DAYS * DAY_MS)

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
  const emailChanges = await db
    .delete(emailChangeRequests)
    .where(lt(emailChangeRequests.expiresAt, tokenLimit))
    .returning({ id: emailChangeRequests.requestId })
  // Só `record` limpava linhas velhas e quase ninguém o chama mais (`reserve` não limpa).
  const attempts = await db
    .delete(rateLimitAttempts)
    .where(lt(rateLimitAttempts.createdAt, attemptLimit))
    .returning({ id: rateLimitAttempts.rateLimitAttemptId })

  return {
    pending: pending.length,
    resetTokens: resetTokens.length,
    emailChanges: emailChanges.length,
    attempts: attempts.length,
  }
}
