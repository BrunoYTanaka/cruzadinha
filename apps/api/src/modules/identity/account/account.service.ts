import type { Database } from '../../../platform/db/client'
import { addMinutes, type Clock } from '../../../platform/lib/clock'
import { hashPassword, verifyPassword } from '../../../platform/lib/password'
import { generateSessionToken, sha256Hex } from '../../../platform/lib/tokens'
import type { EmailService } from '../../../platform/email'
import { emailChangeEmail, emailChangeNotice } from '../../../platform/email'
import {
  admitAddress,
  deleteUserAttempts,
  enterIntervalGate,
  type AddressAdmission,
} from '../../../platform/rate-limit'
import type { RateLimiter, RateLimits } from '../../../platform/rate-limit'
import type { EmailRequestResult } from '../email-request'
import { revokeOpenResetTokens } from '../recovery/reset-tokens.repository'
import { endOtherSessionsForUser } from '../sessions/sessions.repository'
import {
  deleteUser,
  findUserByEmail,
  findUserById,
  updateEmail,
  updatePasswordHash,
} from '../users.repository'
import {
  consumeEmailChange,
  deleteEmailChangeFor,
  EMAIL_CHANGE_TTL_MINUTES,
  upsertEmailChange,
} from './email-change.repository'

export type Throttled = { ok: false; reason: 'too-many-attempts'; retryAfterSeconds: number }
export type PasswordRefused = { ok: false; reason: 'wrong-password' }

export type AccountResult = { ok: true } | PasswordRefused | Throttled

export type ChangeEmailResult =
  | ({ ok: true } & EmailRequestResult)
  | PasswordRefused
  | Throttled
  | { ok: false; reason: 'same-email' }

export type ConfirmEmailChangeResult = { ok: true } | { ok: false; reason: 'invalid-token' }

type Caller = { userId: string; currentPassword: string }

export type AccountService = {
  changePassword(
    input: Caller & { keepTokenHash: string; newPassword: string },
  ): Promise<AccountResult>
  logoutOthers(input: { userId: string; keepTokenHash: string }): Promise<void>
  admitChangeEmail(address: string): Promise<AddressAdmission>
  requestEmailChange(input: Caller & { newEmail: string }): Promise<ChangeEmailResult>
  admitConfirm(address: string): Promise<AddressAdmission>
  confirmEmailChange(input: { token: string }): Promise<ConfirmEmailChangeResult>
  deleteAccount(input: Caller): Promise<AccountResult>
}

export type AccountDeps = {
  db: Database
  clock: Clock
  email: EmailService
  rateLimiter: RateLimiter
  limits: RateLimits
  baseUrl: string
}

export function createAccountService({
  db,
  clock,
  email,
  rateLimiter,
  limits,
  baseUrl,
}: AccountDeps): AccountService {
  const interval = email.intervalSeconds

  // Senha atual das três ações: um balde por usuário, reservado antes do argon2 para pedidos
  // simultâneos se contarem. A linha reservada fica como registro da falha; o acerto a devolve.
  async function confirmCurrentPassword(
    userId: string,
    password: string,
  ): Promise<{ ok: true } | PasswordRefused | Throttled> {
    const key = { action: 'PASSWORD_CONFIRM', keyType: 'USER', keyValue: userId } as const
    const reservation = await rateLimiter.reserve(
      [{ key, window: limits.passwordConfirm }],
      clock(),
    )
    if (!reservation.allowed) {
      return {
        ok: false,
        reason: 'too-many-attempts',
        retryAfterSeconds: reservation.retryAfterSeconds,
      }
    }
    const user = await findUserById(db, userId)
    if (!user || !(await verifyPassword(user.passwordHash, password))) {
      return { ok: false, reason: 'wrong-password' }
    }
    await reservation.release()
    await rateLimiter.clear(key)
    return { ok: true }
  }

  return {
    async changePassword({ userId, currentPassword, newPassword, keepTokenHash }) {
      const checked = await confirmCurrentPassword(userId, currentPassword)
      if (!checked.ok) return checked
      // O hash vem antes da transação: o argon2 não segura a conexão.
      const passwordHash = await hashPassword(newPassword)
      const now = clock()
      await db.transaction(async (tx) => {
        await updatePasswordHash(tx, userId, passwordHash)
        await endOtherSessionsForUser(tx, userId, keepTokenHash, now)
        await revokeOpenResetTokens(tx, userId, now)
      })
      return { ok: true }
    },

    async logoutOthers({ userId, keepTokenHash }) {
      await endOtherSessionsForUser(db, userId, keepTokenHash, clock())
    },

    admitChangeEmail: (address) =>
      admitAddress(rateLimiter, clock(), 'CHANGE_EMAIL', address, limits.changeEmail),
    admitConfirm: (address) =>
      admitAddress(rateLimiter, clock(), 'VERIFY_TOKEN', address, limits.verifyToken),

    async requestEmailChange({ userId, currentPassword, newEmail }) {
      const checked = await confirmCurrentPassword(userId, currentPassword)
      if (!checked.ok) return checked
      const user = await findUserById(db, userId)
      if (!user) return { ok: false, reason: 'wrong-password' }
      // Quem pede está logado, então dizer que o endereço é o seu não revela nada de outra conta.
      if (user.email === newEmail) return { ok: false, reason: 'same-email' }

      const gate = await enterIntervalGate(
        rateLimiter,
        clock(),
        { action: 'CHANGE_EMAIL', keyType: 'USER', keyValue: userId },
        interval,
      )
      if (!gate.ok) return { ok: true, retryAfter: gate.retryAfterSeconds }

      const now = clock()
      let link: { token: string; tokenHash: string } | undefined
      if (await findUserByEmail(db, newEmail)) {
        // Endereço de outra conta: nada é gravado e o pedido anterior da conta também some, para
        // nenhum link antigo continuar valendo. A resposta é a mesma do endereço livre.
        await deleteEmailChangeFor(db, userId)
      } else {
        const token = generateSessionToken()
        const tokenHash = sha256Hex(token)
        await upsertEmailChange(db, {
          userId,
          newEmail,
          tokenHash,
          expiresAt: addMinutes(now, EMAIL_CHANGE_TTL_MINUTES),
        })
        link = { token, tokenHash }
      }

      // O intervalo só é devolvido quando nenhum dos e-mails saiu.
      let outgoing = link ? 2 : 1
      const notSent = async () => {
        outgoing -= 1
        if (outgoing === 0) await gate.release()
      }
      if (link) {
        email.sendAfterResponse(
          'signup',
          {
            to: newEmail,
            ...emailChangeEmail(`${baseUrl}/confirmar-email#token=${link.token}`),
            idempotencyKey: `email-change-${link.tokenHash.slice(0, 32)}`,
          },
          notSent,
        )
      }
      email.sendAfterResponse(
        'signup',
        {
          to: user.email,
          ...emailChangeNotice(now),
          idempotencyKey: `email-change-notice-${sha256Hex(`${userId}:${now.getTime()}`).slice(0, 24)}`,
        },
        notSent,
      )
      return { ok: true, retryAfter: interval }
    },

    async confirmEmailChange({ token }) {
      const now = clock()
      return db.transaction(async (tx): Promise<ConfirmEmailChangeResult> => {
        const request = await consumeEmailChange(tx, sha256Hex(token), now)
        if (!request) return { ok: false, reason: 'invalid-token' }
        // Outra conta pode ter ficado com o endereço depois do pedido: só a troca é desfeita.
        if ((await updateEmail(tx, request.userId, request.newEmail)) === 'taken') {
          return { ok: false, reason: 'invalid-token' }
        }
        // O endereço antigo deixou de ser da conta: os links de recuperação abertos morrem.
        await revokeOpenResetTokens(tx, request.userId, now)
        return { ok: true }
      })
    },

    async deleteAccount({ userId, currentPassword }) {
      const checked = await confirmCurrentPassword(userId, currentPassword)
      if (!checked.ok) return checked
      await db.transaction(async (tx) => {
        await deleteUser(tx, userId)
        await deleteUserAttempts(tx, userId)
      })
      return { ok: true }
    },
  }
}
