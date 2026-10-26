import { eq } from 'drizzle-orm'
import type { Executor } from '../../platform/db/client'
import { users } from '../../platform/db/schema'

export type UserRow = { userId: string; email: string; passwordHash: string }

// Devolve undefined quando o e-mail já tem conta (o índice único decide, sem corrida).
export async function insertIfEmailFree(
  db: Executor,
  values: { email: string; passwordHash: string },
): Promise<{ userId: string; email: string } | undefined> {
  const [row] = await db
    .insert(users)
    .values(values)
    .onConflictDoNothing({ target: users.email })
    .returning({ userId: users.userId, email: users.email })
  return row
}

export async function findUserByEmail(db: Executor, email: string): Promise<UserRow | undefined> {
  const [row] = await db
    .select({ userId: users.userId, email: users.email, passwordHash: users.passwordHash })
    .from(users)
    .where(eq(users.email, email))
  return row
}

export async function updatePasswordHash(
  db: Executor,
  userId: string,
  passwordHash: string,
): Promise<void> {
  await db.update(users).set({ passwordHash }).where(eq(users.userId, userId))
}
