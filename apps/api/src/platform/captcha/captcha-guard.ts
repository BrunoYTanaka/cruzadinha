import { captchaTokenSchema } from '@cruzadinha/shared'
import type { FastifyRequest } from 'fastify'
import type { CaptchaAction, CaptchaVerifier } from './types'

export type CaptchaGuard = {
  /** `true` deixa o pedido seguir; `false` é recusa (a rota responde `captcha-failed`). */
  check(request: FastifyRequest, action: CaptchaAction): Promise<boolean>
}

export type CaptchaGuardOptions = {
  enabled: boolean
  verifier: CaptchaVerifier
  /** Verificações em andamento no total e por endereço; acima disso o pedido é recusado. */
  maxInFlight?: number
  maxInFlightPerAddress?: number
}

export function createCaptchaGuard({
  enabled,
  verifier,
  maxInFlight = 20,
  maxInFlightPerAddress = 2,
}: CaptchaGuardOptions): CaptchaGuard {
  // O captcha vem antes dos limites por endereço; sem este teto, provas lixo fariam a API segurar
  // uma chamada de até 10 s à Cloudflare por pedido e poderiam fazê-la limitar a chave.
  let total = 0
  const perAddress = new Map<string, number>()

  return {
    async check(request, action) {
      if (!enabled) return true

      // Só o token interessa aqui; o corpo inteiro é validado depois, pela rota.
      const body: unknown = request.body
      const token = captchaTokenSchema.safeParse(
        typeof body === 'object' && body !== null && 'captchaToken' in body
          ? body.captchaToken
          : undefined,
      )
      if (!token.success) {
        request.log.debug({ reason: 'missing' }, 'captcha recusado')
        return false
      }

      const address = request.clientAddress
      const mine = perAddress.get(address) ?? 0
      if (total >= maxInFlight || mine >= maxInFlightPerAddress) {
        request.log.debug({ reason: 'busy' }, 'captcha recusado')
        return false
      }
      total += 1
      perAddress.set(address, mine + 1)
      try {
        const result = await verifier.verify({ token: token.data, action, remoteIp: address })
        if (result.ok) return true
        request.log.warn({ reason: result.reason }, 'captcha recusado')
        return false
      } finally {
        total -= 1
        const left = (perAddress.get(address) ?? 1) - 1
        if (left > 0) perAddress.set(address, left)
        else perAddress.delete(address)
      }
    },
  }
}
