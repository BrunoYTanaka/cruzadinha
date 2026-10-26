import type { Database } from '../../../platform/db/client'
import { hashPassword } from '../../../platform/lib/password'
import { insertIfEmailFree } from '../users.repository'

export type CreateAccountResult =
  { ok: true; user: { id: string; email: string } } | { ok: false; reason: 'email-taken' }

// Conta criada pelo autor na linha de comando: sem sessão e sem limite de tentativas (FR-019).
export async function createAccount(
  db: Database,
  { email, password }: { email: string; password: string },
): Promise<CreateAccountResult> {
  const user = await insertIfEmailFree(db, { email, passwordHash: await hashPassword(password) })
  if (!user) return { ok: false, reason: 'email-taken' }
  return { ok: true, user: { id: user.userId, email: user.email } }
}
