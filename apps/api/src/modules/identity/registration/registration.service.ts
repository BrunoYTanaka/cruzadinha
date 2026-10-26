import { createHash } from 'node:crypto'
import type { Database } from '../../../platform/db/client'
import { addDays, type Clock } from '../../../platform/lib/clock'
import { hashPassword } from '../../../platform/lib/password'
import { generateSessionToken, sha256Hex } from '../../../platform/lib/tokens'
import type { EmailService } from '../../../platform/email'
import { existingAccountNotice, verificationEmail } from '../../../platform/email'
import {
  admitAddress,
  type AddressAdmission,
  enterIntervalGate,
} from '../../../platform/rate-limit'
import type { RateLimits, RateLimiter } from '../../../platform/rate-limit'
import { consumePendingByTokenHash, renewPendingToken, upsertPending } from './pending.repository'
import { findUserByEmail, insertIfEmailFree } from '../users.repository'

// Validade do link de confirmação (feature 035).
export const VERIFICATION_TTL_DAYS = 1

export type EmailRequestResult = { retryAfter: number }

export type VerifyEmailResult = { ok: true } | { ok: false; reason: 'invalid-token' }

export type RegistrationService = {
  admitResend(address: string): Promise<AddressAdmission>
  // Cadastro: grava a pendência (ou avisa o dono da conta) e responde igual nos dois casos.
  requestRegistration(input: { email: string }): Promise<EmailRequestResult>
  resendVerification(email: string): Promise<EmailRequestResult>
  admitVerify(address: string): Promise<AddressAdmission>
  // A senha é escolhida aqui, por quem abriu o link.
  verifyEmail(input: { token: string; password: string }): Promise<VerifyEmailResult>
}

export type RegistrationDeps = {
  db: Database
  clock: Clock
  email: EmailService
  rateLimiter: RateLimiter
  limits: RateLimits
  baseUrl: string
}

export function createRegistrationService({
  db,
  clock,
  email,
  rateLimiter,
  limits,
  baseUrl,
}: RegistrationDeps): RegistrationService {
  const interval = email.intervalSeconds

  // Cadastro e reenvio dividem o mesmo intervalo por e-mail, com ou sem conta ou pendência.
  const enterGate = (address: string) =>
    enterIntervalGate(
      rateLimiter,
      clock(),
      { action: 'REGISTER', keyType: 'EMAIL', keyValue: address },
      interval,
    )

  function sendLink(address: string, token: string, release: () => Promise<void>): void {
    const link = `${baseUrl}/verificar-email#token=${token}`
    email.sendAfterResponse(
      'signup',
      {
        to: address,
        ...verificationEmail(link),
        idempotencyKey: `verify-${sha256Hex(token).slice(0, 32)}`,
      },
      release,
    )
  }

  return {
    admitResend: (address) =>
      admitAddress(rateLimiter, clock(), 'RESEND_VERIFICATION', address, limits.resendVerification),
    admitVerify: (address) =>
      admitAddress(rateLimiter, clock(), 'VERIFY_TOKEN', address, limits.verifyToken),

    async requestRegistration({ email: address }) {
      const gate = await enterGate(address)
      if (!gate.ok) return { retryAfter: gate.retryAfterSeconds }
      const now = clock()

      if (await findUserByEmail(db, address)) {
        const bucket = Math.floor(now.getTime() / (interval * 1000))
        email.sendAfterResponse(
          'signup',
          {
            to: address,
            ...existingAccountNotice(),
            idempotencyKey: `notice-${createHash('sha256').update(address).digest('hex').slice(0, 24)}-${bucket}`,
          },
          gate.release,
        )
        return { retryAfter: interval }
      }

      const token = generateSessionToken()
      await upsertPending(db, {
        email: address,
        tokenHash: sha256Hex(token),
        expiresAt: addDays(now, VERIFICATION_TTL_DAYS),
      })
      sendLink(address, token, gate.release)
      return { retryAfter: interval }
    },

    async resendVerification(address) {
      const gate = await enterGate(address)
      if (!gate.ok) return { retryAfter: gate.retryAfterSeconds }

      const token = generateSessionToken()
      const renewed = await renewPendingToken(db, {
        email: address,
        tokenHash: sha256Hex(token),
        expiresAt: addDays(clock(), VERIFICATION_TTL_DAYS),
      })
      // Sem pendência, o intervalo continua contado: soltá-lo faria o tempo restante revelar que
      // há (ou não há) um cadastro pendente.
      if (renewed) sendLink(address, token, gate.release)
      return { retryAfter: interval }
    },

    async verifyEmail({ token, password }) {
      // O hash vem antes de olhar o token: o tempo não separa token bom de ruim.
      const passwordHash = await hashPassword(password)
      const tokenHash = sha256Hex(token)
      const now = clock()
      return db.transaction(async (tx): Promise<VerifyEmailResult> => {
        const pending = await consumePendingByTokenHash(tx, tokenHash, now)
        if (!pending) return { ok: false, reason: 'invalid-token' }
        // O e-mail pode ter virado conta nesse meio tempo: a pendência já foi apagada.
        const user = await insertIfEmailFree(tx, { email: pending.email, passwordHash })
        return user ? { ok: true } : { ok: false, reason: 'invalid-token' }
      })
    },
  }
}
