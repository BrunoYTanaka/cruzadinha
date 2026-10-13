import type { RateWindow } from './limits'
import type { RateLimitKey, RateLimitRepository } from './rate-limit.repository'

export type RateRule = { key: RateLimitKey; window: RateWindow }

export type RateDecision = { allowed: true } | { allowed: false; retryAfterSeconds: number }

export type RateLimiter = {
  check(rules: RateRule[], now: Date): Promise<RateDecision>
  record(keys: RateLimitKey[], now: Date): Promise<void>
  clear(key: RateLimitKey): Promise<void>
}

export function createRateLimiter(repository: RateLimitRepository): RateLimiter {
  return {
    async check(rules, now) {
      let retryAfterSeconds = 0
      for (const { key, window } of rules) {
        const windowMs = window.windowMinutes * 60 * 1000
        const { count, oldest } = await repository.countSince(
          key,
          new Date(now.getTime() - windowMs),
        )
        if (count >= window.max) {
          // A janela libera quando a tentativa mais antiga dentro dela sai.
          const freesAt = (oldest ?? now).getTime() + windowMs
          const seconds = Math.max(1, Math.ceil((freesAt - now.getTime()) / 1000))
          retryAfterSeconds = Math.max(retryAfterSeconds, seconds)
        }
      }
      return retryAfterSeconds > 0 ? { allowed: false, retryAfterSeconds } : { allowed: true }
    },
    record: (keys, now) => repository.record(keys, now),
    clear: (key) => repository.clear(key),
  }
}
