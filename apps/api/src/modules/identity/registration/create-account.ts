import type { Database } from '../../../platform/db/client'
import { hashPassword } from '../../../platform/lib/password'
import { insertIfEmailFree } from '../users.repository'

export type CreateAccountResult =
  { ok: true; user: { id: string; email: string } } | { ok: false; reason: 'email-taken' }

// `isAdmin` só vem da CLI do autor (feature 060); nenhuma rota pública o aceita.
// Conta criada pelo autor na linha de comando: sem sessão e sem limite de tentativas (FR-019).
export async function createAccount(
  db: Database,
  { email, password, isAdmin = false }: { email: string; password: string; isAdmin?: boolean },
): Promise<CreateAccountResult> {
  const user = await insertIfEmailFree(db, {
    email,
    passwordHash: await hashPassword(password),
    isAdmin,
  })
  if (!user) return { ok: false, reason: 'email-taken' }
  return { ok: true, user: { id: user.userId, email: user.email } }
}
