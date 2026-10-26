import type { RateWindow } from './limits'
import type { RateLimitKey, RateLimitRepository } from './rate-limit.repository'

export type RateRule = { key: RateLimitKey; window: RateWindow }

export type RateDecision = { allowed: true } | { allowed: false; retryAfterSeconds: number }

export type Reservation =
  | {
      allowed: true
      /** Apaga as linhas desta reserva (das chaves dadas, ou de todas sem argumento). */
      release(keys?: RateLimitKey[]): Promise<void>
    }
  | { allowed: false; retryAfterSeconds: number }

export type RateLimiter = {
  check(rules: RateRule[], now: Date): Promise<RateDecision>
  /**
   * Conta e grava a tentativa de uma vez, sob trava das chaves: pedidos simultâneos se enxergam e
   * só `max` reservas passam por janela. Uma reserva recusada não grava nada.
   */
  reserve(rules: RateRule[], now: Date): Promise<Reservation>
  record(keys: RateLimitKey[], now: Date): Promise<void>
  clear(key: RateLimitKey): Promise<void>
}

const sameKey = (a: RateLimitKey, b: RateLimitKey) =>
  a.action === b.action && a.keyType === b.keyType && a.keyValue === b.keyValue

export function createRateLimiter(repository: RateLimitRepository): RateLimiter {
  // Segundos até a janela liberar; 0 se a próxima tentativa cabe.
  async function waitFor(repo: RateLimitRepository, rule: RateRule, now: Date): Promise<number> {
    const windowMs = rule.window.windowMinutes * 60 * 1000
    const { count, oldest } = await repo.countSince(rule.key, new Date(now.getTime() - windowMs))
    if (count < rule.window.max) return 0
    // A janela libera quando a tentativa mais antiga dentro dela sai.
    const freesAt = (oldest ?? now).getTime() + windowMs
    return Math.max(1, Math.ceil((freesAt - now.getTime()) / 1000))
  }

  async function longestWait(repo: RateLimitRepository, rules: RateRule[], now: Date) {
    let retryAfterSeconds = 0
    for (const rule of rules) {
      retryAfterSeconds = Math.max(retryAfterSeconds, await waitFor(repo, rule, now))
    }
    return retryAfterSeconds
  }

  return {
    async check(rules, now) {
      const retryAfterSeconds = await longestWait(repository, rules, now)
      return retryAfterSeconds > 0 ? { allowed: false, retryAfterSeconds } : { allowed: true }
    },

    async reserve(rules, now) {
      const keys = rules.map((rule) => rule.key)
      // Contar e gravar sob a trava das chaves: cada pedido vê os que o antecederam.
      const { wait, ids } = await repository.withKeyLocks(keys, async (locked) => {
        const wait = await longestWait(locked, rules, now)
        return { wait, ids: wait > 0 ? [] : await locked.insert(keys, now) }
      })
      if (wait > 0) return { allowed: false, retryAfterSeconds: wait }
      return {
        allowed: true,
        async release(released = keys) {
          const own = ids.filter((_, i) =>
            released.some((key) => sameKey(key, keys[i] as RateLimitKey)),
          )
          await repository.deleteByIds(own)
        },
      }
    },

    record: (keys, now) => repository.record(keys, now),
    clear: (key) => repository.clear(key),
  }
}
