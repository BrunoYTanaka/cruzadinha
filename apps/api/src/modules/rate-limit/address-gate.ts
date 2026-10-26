import type { RateWindow } from './limits'
import type { RateLimitKey } from './rate-limit.repository'
import type { RateLimiter } from './rate-limit.service'

export type AddressAdmission = { ok: true } | { ok: false; retryAfterSeconds: number }

// Conta a tentativa do endereço antes de olhar o corpo, como o cadastro faz desde a feature 004.
export async function admitAddress(
  rateLimiter: RateLimiter,
  now: Date,
  action: RateLimitKey['action'],
  address: string,
  window: RateWindow,
): Promise<AddressAdmission> {
  const key: RateLimitKey = { action, keyType: 'NETWORK_ADDRESS', keyValue: address }
  const decision = await rateLimiter.check([{ key, window }], now)
  if (!decision.allowed) return { ok: false, retryAfterSeconds: decision.retryAfterSeconds }
  await rateLimiter.record([key], now)
  return { ok: true }
}
