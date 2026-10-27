import { and, eq, gt } from 'drizzle-orm'
import type { Executor } from '../../../platform/db/client'
import { emailChangeRequests } from '../../../platform/db/schema'

// Validade do link de troca de e-mail (feature 042).
export const EMAIL_CHANGE_TTL_MINUTES = 60

// No máximo um pedido por conta: um novo troca o hash, e o link anterior deixa de valer.
export async function upsertEmailChange(
  db: Executor,
  values: { userId: string; newEmail: string; tokenHash: string; expiresAt: Date },
): Promise<void> {
  await db
    .insert(emailChangeRequests)
    .values(values)
    .onConflictDoUpdate({
      target: emailChangeRequests.userId,
      set: {
        newEmail: values.newEmail,
        tokenHash: values.tokenHash,
        expiresAt: values.expiresAt,
      },
    })
}

// Uso único: só um pedido consegue apagar a linha. Roda na transação da troca.
export async function consumeEmailChange(
  db: Executor,
  tokenHash: string,
  now: Date,
): Promise<{ userId: string; newEmail: string } | undefined> {
  const [row] = await db
    .delete(emailChangeRequests)
    .where(
      and(eq(emailChangeRequests.tokenHash, tokenHash), gt(emailChangeRequests.expiresAt, now)),
    )
    .returning({ userId: emailChangeRequests.userId, newEmail: emailChangeRequests.newEmail })
  return row
}

export async function deleteEmailChangeFor(db: Executor, userId: string): Promise<void> {
  await db.delete(emailChangeRequests).where(eq(emailChangeRequests.userId, userId))
}
