import { and, count, desc, eq, gt, isNull } from 'drizzle-orm'
import type { Database, Executor } from '../../db/client'
import { invites, users } from '../../db/schema'

export async function insertInvite(
  db: Executor,
  values: { codeHash: string; createdByUserId: string | null; expiresAt: Date },
): Promise<{ inviteId: string; expiresAt: Date }> {
  const [row] = await db
    .insert(invites)
    .values(values)
    .returning({ inviteId: invites.inviteId, expiresAt: invites.expiresAt })
  if (!row) throw new Error('insert de convite sem retorno')
  return row
}

// Trava a linha do convite ativo: um cadastro simultâneo com o mesmo código espera e,
// ao reavaliar a condição, não o encontra mais.
export async function lockValidInviteByCodeHash(
  tx: Executor,
  codeHash: string,
  now: Date,
): Promise<{ inviteId: string } | undefined> {
  const [row] = await tx
    .select({ inviteId: invites.inviteId })
    .from(invites)
    .where(
      and(
        eq(invites.codeHash, codeHash),
        isNull(invites.usedAt),
        isNull(invites.revokedAt),
        gt(invites.expiresAt, now),
      ),
    )
    .for('update')
  return row
}

export async function markInviteUsed(
  tx: Executor,
  inviteId: string,
  userId: string,
  now: Date,
): Promise<void> {
  await tx
    .update(invites)
    .set({ usedByUserId: userId, usedAt: now })
    .where(eq(invites.inviteId, inviteId))
}

// Trava a linha do usuário para serializar os pedidos dele: a contagem e o insert
// acontecem sem que outro pedido simultâneo do mesmo usuário passe no meio (FR-021).
export async function insertInviteWithinQuota(
  db: Database,
  values: { userId: string; codeHash: string; expiresAt: Date; now: Date; quota: number },
): Promise<{ inviteId: string; expiresAt: Date } | 'quota-reached'> {
  return db.transaction(async (tx) => {
    await tx
      .select({ userId: users.userId })
      .from(users)
      .where(eq(users.userId, values.userId))
      .for('update')
    const [row] = await tx
      .select({ active: count() })
      .from(invites)
      .where(
        and(
          eq(invites.createdByUserId, values.userId),
          isNull(invites.usedAt),
          isNull(invites.revokedAt),
          gt(invites.expiresAt, values.now),
        ),
      )
    if ((row?.active ?? 0) >= values.quota) return 'quota-reached'
    return insertInvite(tx, {
      codeHash: values.codeHash,
      createdByUserId: values.userId,
      expiresAt: values.expiresAt,
    })
  })
}

export type InviteRow = {
  inviteId: string
  createdAt: Date
  expiresAt: Date
  usedAt: Date | null
  revokedAt: Date | null
}

export async function listInvitesByCreator(db: Executor, userId: string): Promise<InviteRow[]> {
  return db
    .select({
      inviteId: invites.inviteId,
      createdAt: invites.createdAt,
      expiresAt: invites.expiresAt,
      usedAt: invites.usedAt,
      revokedAt: invites.revokedAt,
    })
    .from(invites)
    .where(eq(invites.createdByUserId, userId))
    .orderBy(desc(invites.createdAt), desc(invites.inviteId))
}

export type InviteWithCreator = InviteRow & { creatorEmail: string | null }

export async function listAllInvites(db: Executor): Promise<InviteWithCreator[]> {
  return db
    .select({
      inviteId: invites.inviteId,
      createdAt: invites.createdAt,
      expiresAt: invites.expiresAt,
      usedAt: invites.usedAt,
      revokedAt: invites.revokedAt,
      creatorEmail: users.email,
    })
    .from(invites)
    .leftJoin(users, eq(users.userId, invites.createdByUserId))
    .orderBy(desc(invites.createdAt), desc(invites.inviteId))
}

// Só revoga convite não usado e ainda não revogado (inclusive expirado).
export async function revokeInvite(db: Executor, inviteId: string, now: Date): Promise<boolean> {
  const rows = await db
    .update(invites)
    .set({ revokedAt: now })
    .where(and(eq(invites.inviteId, inviteId), isNull(invites.usedAt), isNull(invites.revokedAt)))
    .returning({ inviteId: invites.inviteId })
  return rows.length > 0
}
