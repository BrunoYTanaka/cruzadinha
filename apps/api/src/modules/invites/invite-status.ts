import type { InviteStatus } from '@cruzadinha/shared'

export type InviteTimes = { usedAt: Date | null; revokedAt: Date | null; expiresAt: Date }

// A situação não é guardada: sai dos campos, nesta ordem de precedência.
export function inviteStatus(invite: InviteTimes, now: Date): InviteStatus {
  if (invite.usedAt) return 'used'
  if (invite.revokedAt) return 'revoked'
  if (now.getTime() >= invite.expiresAt.getTime()) return 'expired'
  return 'active'
}
