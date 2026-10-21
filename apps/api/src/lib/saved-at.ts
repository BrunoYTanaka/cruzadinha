// Tolerância para relógios de aparelhos adiantados: um `savedAt` além disso no futuro é recusado
// (progresso, feature 008; configurações, feature 021).
export const MAX_CLOCK_SKEW_MS = 5 * 60 * 1000

export function savedAtTooFar(savedAt: string, now: Date): boolean {
  return new Date(savedAt).getTime() > now.getTime() + MAX_CLOCK_SKEW_MS
}
