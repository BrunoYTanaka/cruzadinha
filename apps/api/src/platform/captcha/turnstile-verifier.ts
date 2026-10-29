import { isIP } from 'node:net'
import { z } from 'zod'
import type { CaptchaVerifier } from './types'

const ENDPOINT = 'https://challenges.cloudflare.com/turnstile/v0/siteverify'
const TIMEOUT_MS = 10_000

// Só estes campos importam; o resto da resposta é ignorado.
const responseSchema = z.object({
  success: z.boolean(),
  hostname: z.string().optional(),
  action: z.string().optional(),
})

export type TurnstileOptions = { secret: string; hostname: string; fetch?: typeof fetch }

export function createTurnstileVerifier({
  secret,
  hostname,
  fetch: fetcher = fetch,
}: TurnstileOptions): CaptchaVerifier {
  return {
    async verify({ token, action, remoteIp }) {
      let response: Response
      try {
        response = await fetcher(ENDPOINT, {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          // Sem `idempotency_key`: a prova é de uso único e repetir a validação seria reuso. Os
          // limites contam um IPv6 pelo bloco /64, que não é um endereço: nesse caso não vai.
          body: JSON.stringify({
            secret,
            response: token,
            ...(isIP(remoteIp) ? { remoteip: remoteIp } : {}),
          }),
          signal: AbortSignal.timeout(TIMEOUT_MS),
        })
      } catch {
        return { ok: false, reason: 'unavailable' }
      }
      if (!response.ok) return { ok: false, reason: 'unavailable' }

      const body: unknown = await response.json().catch(() => undefined)
      const parsed = responseSchema.safeParse(body)
      if (!parsed.success) return { ok: false, reason: 'unavailable' }
      if (!parsed.data.success) return { ok: false, reason: 'rejected' }
      if (parsed.data.action !== action) return { ok: false, reason: 'wrong-action' }
      if (parsed.data.hostname !== hostname) return { ok: false, reason: 'wrong-hostname' }
      return { ok: true }
    },
  }
}
