import { and, eq, gt } from 'drizzle-orm'
import type { Executor } from '../../../platform/db/client'
import { pendingRegistrations } from '../../../platform/db/schema'

// Cadastro novo ou renovação: só o token e a validade mudam. A pendência não guarda senha (ela é
// escolhida por quem abre o link), então ninguém a sequestra cadastrando o e-mail de outra pessoa.
export async function upsertPending(
  db: Executor,
  values: { email: string; tokenHash: string; expiresAt: Date },
): Promise<void> {
  await db
    .insert(pendingRegistrations)
    .values(values)
    .onConflictDoUpdate({
      target: pendingRegistrations.email,
      set: { tokenHash: values.tokenHash, expiresAt: values.expiresAt },
    })
}

// Novo token para a pendência existente (reenvio). Sem pendência, nada muda.
export async function renewPendingToken(
  db: Executor,
  values: { email: string; tokenHash: string; expiresAt: Date },
): Promise<boolean> {
  const rows = await db
    .update(pendingRegistrations)
    .set({ tokenHash: values.tokenHash, expiresAt: values.expiresAt })
    .where(eq(pendingRegistrations.email, values.email))
    .returning({ pendingId: pendingRegistrations.pendingId })
  return rows.length > 0
}

// Uso único: apagar e devolver numa instrução só, então dois cliques não criam duas contas.
export async function consumePendingByTokenHash(
  db: Executor,
  tokenHash: string,
  now: Date,
): Promise<{ email: string } | undefined> {
  const [row] = await db
    .delete(pendingRegistrations)
    .where(
      and(eq(pendingRegistrations.tokenHash, tokenHash), gt(pendingRegistrations.expiresAt, now)),
    )
    .returning({ email: pendingRegistrations.email })
  return row
}
