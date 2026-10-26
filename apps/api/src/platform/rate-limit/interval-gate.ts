import type { RateLimitKey } from './rate-limit.repository'
import type { RateLimiter } from './rate-limit.service'

export type IntervalGate =
  { ok: true; release: () => Promise<void> } | { ok: false; retryAfterSeconds: number }

// Intervalo mínimo entre pedidos por e-mail (feature 035). A tentativa conta sempre, haja conta,
// pendência ou nada para o e-mail; assim o tempo restante devolvido é igual nos três casos e não
// revela nada. `release` desfaz a contagem quando nenhum e-mail chegou a sair.
export async function enterIntervalGate(
  rateLimiter: RateLimiter,
  now: Date,
  key: RateLimitKey,
  intervalSeconds: number,
): Promise<IntervalGate> {
  // Contar e gravar de uma vez: dois pedidos juntos não passam os dois pelo intervalo.
  const reservation = await rateLimiter.reserve(
    [{ key, window: { max: 1, windowMinutes: intervalSeconds / 60 } }],
    now,
  )
  if (!reservation.allowed) return { ok: false, retryAfterSeconds: reservation.retryAfterSeconds }
  return { ok: true, release: () => reservation.release() }
}
