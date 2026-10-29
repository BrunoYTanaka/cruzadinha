import type { CaptchaAction } from '@cruzadinha/shared'

export type { CaptchaAction }

// O motivo serve só a log e a testes: o cliente sempre recebe o mesmo erro genérico.
export type CaptchaResult =
  | { ok: true }
  | {
      ok: false
      reason: 'missing' | 'rejected' | 'wrong-action' | 'wrong-hostname' | 'unavailable'
    }

export interface CaptchaVerifier {
  verify(input: { token: string; action: CaptchaAction; remoteIp: string }): Promise<CaptchaResult>
}
