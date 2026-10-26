import { z } from 'zod'
import type { EmailSender, SendResult } from './types'

const ENDPOINT = 'https://api.resend.com/emails'
const TIMEOUT_MS = 10_000

// Só o `name` do erro importa: o status 429 serve para cota e para excesso de pedidos por segundo.
const errorBodySchema = z.object({ name: z.string() })

export type ResendOptions = { apiKey: string; from: string; fetch?: typeof fetch }

export function createResendSender({
  apiKey,
  from,
  fetch: fetcher = fetch,
}: ResendOptions): EmailSender {
  return {
    async send(message): Promise<SendResult> {
      let response: Response
      try {
        response = await fetcher(ENDPOINT, {
          method: 'POST',
          headers: {
            authorization: `Bearer ${apiKey}`,
            'content-type': 'application/json',
            'idempotency-key': message.idempotencyKey,
          },
          body: JSON.stringify({
            from,
            to: [message.to],
            subject: message.subject,
            html: message.html,
            text: message.text,
          }),
          signal: AbortSignal.timeout(TIMEOUT_MS),
        })
      } catch {
        return { ok: false, reason: 'failed' }
      }
      if (response.ok) return { ok: true }

      const body: unknown = await response.json().catch(() => undefined)
      const parsed = errorBodySchema.safeParse(body)
      if (response.status === 429 && parsed.success) {
        if (parsed.data.name === 'daily_quota_exceeded') return { ok: false, reason: 'quota-daily' }
        if (parsed.data.name === 'monthly_quota_exceeded') {
          return { ok: false, reason: 'quota-monthly' }
        }
        if (parsed.data.name === 'rate_limit_exceeded') return { ok: false, reason: 'rate-limited' }
      }
      return { ok: false, reason: 'failed' }
    },
  }
}
