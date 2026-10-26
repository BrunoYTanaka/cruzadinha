import type { Database } from '../../../platform/db/client'
import { addDays, type Clock } from '../../../platform/lib/clock'
import { createDummyHash, hashPassword, verifyPassword } from '../../../platform/lib/password'
import { generateSessionToken, sha256Hex } from '../../../platform/lib/tokens'
import type { RateLimits, RateLimiter } from '../../../platform/rate-limit'
import { decideSession, SESSION_ABSOLUTE_DAYS, SESSION_IDLE_DAYS } from './session-policy'
import {
  createSession,
  deleteStaleSessions,
  endSessionByTokenHash,
  findSessionByTokenHash,
  renewSession,
} from './sessions.repository'
import { findUserByEmail, insertIfEmailFree } from '../users.repository'

export type AuthUser = { id: string; email: string }

export type OpenedSession = { user: AuthUser; sessionToken: string; expiresAt: Date }

export type Throttled = { ok: false; reason: 'too-many-attempts'; retryAfterSeconds: number }

export type CreateAccountResult =
  { ok: true; user: AuthUser } | { ok: false; reason: 'email-taken' }

export type LoginResult =
  ({ ok: true } & OpenedSession) | Throttled | { ok: false; reason: 'invalid-credentials' }

export type Authenticated = { user: AuthUser; renewedExpiresAt?: Date }

export type AuthService = {
  // Conta a tentativa de cadastro do endereço antes de olhar o corpo (FR-028).
  admitRegistration(address: string): Promise<{ ok: true } | Throttled>
  // Conta criada pelo autor na linha de comando: sem sessão e sem limite de tentativas (FR-019).
  createAccount(input: { email: string; password: string }): Promise<CreateAccountResult>
  login(input: { email: string; password: string; address: string }): Promise<LoginResult>
  authenticate(sessionToken: string | undefined): Promise<Authenticated | null>
  logout(sessionToken: string | undefined): Promise<void>
  // Apaga as sessões vencidas e as encerradas há mais de 7 dias; devolve quantas (`puzzles collect`).
  purgeStaleSessions(): Promise<number>
}

// Valor do cookie: 32 bytes em base64url. Outro formato nem chega ao banco.
const SESSION_TOKEN = /^[A-Za-z0-9_-]{43}$/

export type AuthDeps = {
  db: Database
  clock: Clock
  rateLimiter: RateLimiter
  limits: RateLimits
}

export function createAuthService({ db, clock, rateLimiter, limits }: AuthDeps): AuthService {
  // Calculado uma vez: o login com e-mail inexistente verifica contra ele e gasta o mesmo tempo.
  let dummyHash: Promise<string> | undefined
  const getDummyHash = () => (dummyHash ??= createDummyHash())

  async function openSession(
    executor: Parameters<typeof createSession>[0],
    user: AuthUser,
    now: Date,
  ): Promise<OpenedSession> {
    const sessionToken = generateSessionToken()
    const expiresAt = addDays(now, SESSION_IDLE_DAYS)
    await createSession(executor, {
      userId: user.id,
      tokenHash: sha256Hex(sessionToken),
      expiresAt,
      absoluteExpiresAt: addDays(now, SESSION_ABSOLUTE_DAYS),
    })
    return { user, sessionToken, expiresAt }
  }

  return {
    async admitRegistration(address) {
      const now = clock()
      const key = { action: 'REGISTER', keyType: 'NETWORK_ADDRESS', keyValue: address } as const
      const decision = await rateLimiter.check([{ key, window: limits.register }], now)
      if (!decision.allowed) {
        return {
          ok: false,
          reason: 'too-many-attempts',
          retryAfterSeconds: decision.retryAfterSeconds,
        }
      }
      await rateLimiter.record([key], now)
      return { ok: true }
    },

    async createAccount({ email, password }) {
      const passwordHash = await hashPassword(password)
      const user = await insertIfEmailFree(db, { email, passwordHash })
      if (!user) return { ok: false, reason: 'email-taken' }
      return { ok: true, user: { id: user.userId, email: user.email } }
    },

    async login({ email, password, address }) {
      const now = clock()
      const emailKey = { action: 'LOGIN', keyType: 'EMAIL', keyValue: email } as const
      const addressKey = { action: 'LOGIN', keyType: 'NETWORK_ADDRESS', keyValue: address } as const
      // A tentativa é gravada antes da senha: pedidos simultâneos se contam entre si e só `max`
      // chegam ao argon2. A recusa devolve as próprias linhas, então não prolonga a janela.
      const reservation = await rateLimiter.reserve(
        [
          { key: emailKey, window: limits.loginEmail },
          { key: addressKey, window: limits.loginAddress },
        ],
        now,
      )
      if (!reservation.allowed) {
        return {
          ok: false,
          reason: 'too-many-attempts',
          retryAfterSeconds: reservation.retryAfterSeconds,
        }
      }

      // Os dois caminhos de falha fazem a mesma consulta e a mesma verificação; a linha reservada
      // já é o registro da falha.
      const user = await findUserByEmail(db, email)
      const valid = await verifyPassword(user?.passwordHash ?? (await getDummyHash()), password)
      if (!user || !valid) return { ok: false, reason: 'invalid-credentials' }

      // Só falhas contam contra o endereço: a tentativa certa devolve a linha dele.
      await reservation.release([addressKey])
      await rateLimiter.clear(emailKey)
      const session = await openSession(db, { id: user.userId, email: user.email }, now)
      return { ok: true, ...session }
    },

    async authenticate(sessionToken) {
      if (!sessionToken || !SESSION_TOKEN.test(sessionToken)) return null
      const session = await findSessionByTokenHash(db, sha256Hex(sessionToken))
      if (!session) return null

      const now = clock()
      const decision = decideSession(session, now)
      if (decision.status !== 'active') return null

      const user = { id: session.userId, email: session.email }
      if (!decision.renewTo) return { user }
      await renewSession(db, session.sessionId, decision.renewTo)
      return { user, renewedExpiresAt: decision.renewTo }
    },

    purgeStaleSessions: () => deleteStaleSessions(db, clock()),

    async logout(sessionToken) {
      if (!sessionToken || !SESSION_TOKEN.test(sessionToken)) return
      await endSessionByTokenHash(db, sha256Hex(sessionToken), clock())
    },
  }
}
