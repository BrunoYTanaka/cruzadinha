import { and, eq, gt, isNull } from 'drizzle-orm'
import type { Executor } from '../../../db/client'
import { passwordResetTokens } from '../../../db/schema'

// Um pedido novo invalida os anteriores: no máximo um token aberto por usuário. O índice único
// parcial decide quando dois pedidos chegam juntos: o segundo não insere nada e devolve `false`.
export async function replaceResetToken(
  db: Executor,
  values: { userId: string; tokenHash: string; expiresAt: Date; now: Date },
): Promise<boolean> {
  await db
    .update(passwordResetTokens)
    .set({ usedAt: values.now })
    .where(and(eq(passwordResetTokens.userId, values.userId), isNull(passwordResetTokens.usedAt)))
  const inserted = await db
    .insert(passwordResetTokens)
    .values({
      userId: values.userId,
      tokenHash: values.tokenHash,
      expiresAt: values.expiresAt,
      createdAt: values.now,
    })
    .onConflictDoNothing({
      target: passwordResetTokens.userId,
      where: isNull(passwordResetTokens.usedAt),
    })
    .returning({ tokenId: passwordResetTokens.tokenId })
  return inserted.length > 0
}

// Uso único: só um pedido consegue marcar o token como usado.
export async function consumeResetToken(
  db: Executor,
  tokenHash: string,
  now: Date,
): Promise<{ userId: string } | undefined> {
  const [row] = await db
    .update(passwordResetTokens)
    .set({ usedAt: now })
    .where(
      and(
        eq(passwordResetTokens.tokenHash, tokenHash),
        isNull(passwordResetTokens.usedAt),
        gt(passwordResetTokens.expiresAt, now),
      ),
    )
    .returning({ userId: passwordResetTokens.userId })
  return row
}

// Depois de redefinir, nenhum outro link do usuário continua valendo.
export async function revokeOpenResetTokens(
  db: Executor,
  userId: string,
  now: Date,
): Promise<void> {
  await db
    .update(passwordResetTokens)
    .set({ usedAt: now })
    .where(and(eq(passwordResetTokens.userId, userId), isNull(passwordResetTokens.usedAt)))
}
