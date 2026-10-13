export const SESSION_IDLE_DAYS = 30
export const SESSION_ABSOLUTE_DAYS = 365
export const SESSION_RENEW_AFTER_DAYS = 1

const DAY_MS = 24 * 60 * 60 * 1000

export type SessionTimes = { expiresAt: Date; absoluteExpiresAt: Date; endedAt: Date | null }

export type SessionDecision =
  { status: 'ended' } | { status: 'expired' } | { status: 'active'; renewTo?: Date }

// Expiração deslizante (FR-014): 30 dias sem uso, renovada no máximo uma vez por dia,
// sem passar do limite absoluto de 1 ano desde a abertura.
export function decideSession(session: SessionTimes, now: Date): SessionDecision {
  if (session.endedAt) return { status: 'ended' }
  if (now.getTime() >= session.expiresAt.getTime()) return { status: 'expired' }

  const remaining = session.expiresAt.getTime() - now.getTime()
  const renewedAgo = SESSION_IDLE_DAYS * DAY_MS - remaining
  const canGrow = session.expiresAt.getTime() < session.absoluteExpiresAt.getTime()
  if (renewedAgo <= SESSION_RENEW_AFTER_DAYS * DAY_MS || !canGrow) return { status: 'active' }

  const renewTo = Math.min(
    now.getTime() + SESSION_IDLE_DAYS * DAY_MS,
    session.absoluteExpiresAt.getTime(),
  )
  return { status: 'active', renewTo: new Date(renewTo) }
}
