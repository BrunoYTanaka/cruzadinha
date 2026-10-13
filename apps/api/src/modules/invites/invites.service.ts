import type { InviteStatus } from '@cruzadinha/shared'
import type { Database } from '../../db/client'
import { addDays, type Clock } from '../../lib/clock'
import { formatInviteCode, generateInviteCode, sha256Hex } from '../../lib/tokens'
import type { RateLimits } from '../rate-limit/limits'
import type { RateLimiter } from '../rate-limit/rate-limit.service'
import { inviteStatus } from './invite-status'
import {
  insertInvite,
  insertInviteWithinQuota,
  listAllInvites,
  listInvitesByCreator,
  revokeInvite,
} from './invites.repository'

export const DEFAULT_INVITE_DAYS = 7
export const INVITE_QUOTA = 3

export type CreatedInvite = { inviteId: string; code: string; expiresAt: Date }

export type UserInvite = { createdAt: Date; expiresAt: Date; status: InviteStatus }

export type AdminInvite = UserInvite & { inviteId: string; creatorEmail: string | null }

export type CreateForUserResult =
  | ({ ok: true } & CreatedInvite)
  | { ok: false; reason: 'quota-reached' }
  | { ok: false; reason: 'too-many-attempts'; retryAfterSeconds: number }

export type InvitesService = {
  // Caminho da linha de comando: sem cota e sem criador.
  createInvite(input: { days: number }): Promise<CreatedInvite>
  createForUser(userId: string, address: string): Promise<CreateForUserResult>
  listForUser(userId: string): Promise<UserInvite[]>
  // Linha de comando do autor.
  listAll(): Promise<AdminInvite[]>
  revoke(inviteId: string): Promise<'revoked' | 'nothing-to-revoke'>
}

export type InvitesDeps = {
  db: Database
  clock: Clock
  // Só o caminho da API usa limite de tentativas; a linha de comando não.
  rateLimiter?: RateLimiter
  limits?: RateLimits
}

export function createInvitesService({
  db,
  clock,
  rateLimiter,
  limits,
}: InvitesDeps): InvitesService {
  async function create(createdByUserId: string | null, days: number): Promise<CreatedInvite> {
    if (!Number.isInteger(days) || days < 1) throw new RangeError('days deve ser inteiro positivo')
    const code = generateInviteCode()
    const row = await insertInvite(db, {
      codeHash: sha256Hex(code),
      createdByUserId,
      expiresAt: addDays(clock(), days),
    })
    return { inviteId: row.inviteId, code: formatInviteCode(code), expiresAt: row.expiresAt }
  }

  return {
    createInvite: ({ days }) => create(null, days),

    async createForUser(userId, address) {
      if (!rateLimiter || !limits) throw new Error('limite de tentativas não configurado')
      const now = clock()
      const key = {
        action: 'INVITE_CREATE',
        keyType: 'NETWORK_ADDRESS',
        keyValue: address,
      } as const
      const decision = await rateLimiter.check([{ key, window: limits.inviteCreate }], now)
      if (!decision.allowed) {
        return {
          ok: false,
          reason: 'too-many-attempts',
          retryAfterSeconds: decision.retryAfterSeconds,
        }
      }
      await rateLimiter.record([key], now)

      const code = generateInviteCode()
      const row = await insertInviteWithinQuota(db, {
        userId,
        codeHash: sha256Hex(code),
        expiresAt: addDays(now, DEFAULT_INVITE_DAYS),
        now,
        quota: INVITE_QUOTA,
      })
      if (row === 'quota-reached') return { ok: false, reason: 'quota-reached' }
      return {
        ok: true,
        inviteId: row.inviteId,
        code: formatInviteCode(code),
        expiresAt: row.expiresAt,
      }
    },

    async listForUser(userId) {
      const now = clock()
      const rows = await listInvitesByCreator(db, userId)
      return rows.map((row) => ({
        createdAt: row.createdAt,
        expiresAt: row.expiresAt,
        status: inviteStatus(row, now),
      }))
    },

    async listAll() {
      const now = clock()
      const rows = await listAllInvites(db)
      return rows.map((row) => ({
        inviteId: row.inviteId,
        creatorEmail: row.creatorEmail,
        createdAt: row.createdAt,
        expiresAt: row.expiresAt,
        status: inviteStatus(row, now),
      }))
    },

    async revoke(inviteId) {
      return (await revokeInvite(db, inviteId, clock())) ? 'revoked' : 'nothing-to-revoke'
    },
  }
}
