import type { GuestProgress } from '../../../domain/guest/guest-progress'

export type GuestSummary = { total: number; completed: number; inProgress: number }

export function summarizeGuest(records: GuestProgress[]): GuestSummary {
  const completed = records.filter((r) => r.status === 'completed').length
  return { total: records.length, completed, inProgress: records.length - completed }
}
