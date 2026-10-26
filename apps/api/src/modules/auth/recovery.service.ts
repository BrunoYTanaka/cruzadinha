import type { Database } from '../../db/client'
import { addMinutes, type Clock } from '../../lib/clock'
import { hashPassword } from '../../lib/password'
import { generateSessionToken, sha256Hex } from '../../lib/tokens'
import type { EmailService } from '../email/email.service'
import { passwordResetEmail } from '../email/templates'
import { admitAddress, type AddressAdmission } from '../rate-limit/address-gate'
import { enterIntervalGate } from '../rate-limit/interval-gate'
import type { RateLimits } from '../rate-limit/limits'
import type { RateLimiter } from '../rate-limit/rate-limit.service'
import type { EmailRequestResult } from './registration.service'
import {
  consumeResetToken,
  replaceResetToken,
  revokeOpenResetTokens,
} from './reset-tokens.repository'
import { endAllSessionsForUser } from './sessions.repository'
import { findUserByEmail, updatePasswordHash } from './users.repository'

// Validade do link de recuperação (feature 035).
export const RESET_TTL_MINUTES = 60

export type ResetPasswordResult = { ok: true } | { ok: false; reason: 'invalid-token' }

export type RecoveryService = {
  admitForgot(address: string): Promise<AddressAdmission>
  requestReset(email: string): Promise<EmailRequestResult>
  admitReset(address: string): Promise<AddressAdmission>
  resetPassword(input: { token: string; password: string }): Promise<ResetPasswordResult>
}

export type RecoveryDeps = {
  db: Database
  clock: Clock
  email: EmailService
  rateLimiter: RateLimiter
  limits: RateLimits
  baseUrl: string
}

export function createRecoveryService({
  db,
  clock,
  email,
  rateLimiter,
  limits,
  baseUrl,
}: RecoveryDeps): RecoveryService {
  const interval = email.intervalSeconds

  return {
    admitForgot: (address) =>
      admitAddress(rateLimiter, clock(), 'FORGOT_PASSWORD', address, limits.forgotPassword),
    admitReset: (address) =>
      admitAddress(rateLimiter, clock(), 'RESET_PASSWORD', address, limits.resetPassword),

    async requestReset(address) {
      // O intervalo conta o pedido haja ou não conta para o e-mail: o tempo restante devolvido é o
      // mesmo nos dois casos e não revela se a conta existe.
      const gate = await enterIntervalGate(
        rateLimiter,
        clock(),
        { action: 'FORGOT_PASSWORD', keyType: 'EMAIL', keyValue: address },
        interval,
      )
      if (!gate.ok) return { retryAfter: gate.retryAfterSeconds }

      const now = clock()
      const user = await findUserByEmail(db, address)
      // Sem conta, o intervalo continua contado: soltá-lo faria o tempo restante revelar a conta.
      if (!user) return { retryAfter: interval }

      const token = generateSessionToken()
      const tokenHash = sha256Hex(token)
      const stored = await db.transaction((tx) =>
        replaceResetToken(tx, {
          userId: user.userId,
          tokenHash,
          expiresAt: addMinutes(now, RESET_TTL_MINUTES),
          now,
        }),
      )
      if (!stored) {
        // Outro pedido do mesmo usuário chegou junto e já enviou o link.
        await gate.release()
        return { retryAfter: interval }
      }
      email.sendAfterResponse(
        'recovery',
        {
          to: address,
          ...passwordResetEmail(`${baseUrl}/redefinir-senha#token=${token}`),
          idempotencyKey: `reset-${tokenHash.slice(0, 32)}`,
        },
        gate.release,
      )
      return { retryAfter: interval }
    },

    async resetPassword({ token, password }) {
      // O hash vem antes de olhar o token: o tempo não separa token bom de ruim.
      const passwordHash = await hashPassword(password)
      const now = clock()
      return db.transaction(async (tx): Promise<ResetPasswordResult> => {
        const used = await consumeResetToken(tx, sha256Hex(token), now)
        if (!used) return { ok: false, reason: 'invalid-token' }
        await updatePasswordHash(tx, used.userId, passwordHash)
        await revokeOpenResetTokens(tx, used.userId, now)
        await endAllSessionsForUser(tx, used.userId, now)
        return { ok: true }
      })
    },
  }
}
