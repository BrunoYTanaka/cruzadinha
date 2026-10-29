import { useRef, useState } from 'react'
import { config } from '../../../shared/services/config/config'
import { useRegistration } from './useRegistration'

// Estado do captcha de uma tela (feature 049): a prova de uso único, o aviso de falha e o reset
// depois de cada envio. Com a API sem captcha, `ready` é sempre verdadeiro e nada é renderizado.
export function useCaptcha() {
  const { captchaRequired } = useRegistration()
  const [token, setToken] = useState<string | null>(null)
  const [failed, setFailed] = useState(false)
  const [attempt, setAttempt] = useState(0)
  const [resets, setResets] = useState(0)
  // A prova ainda não gasta, lida fora da renderização: dois envios no mesmo instante não a repetem.
  const unspent = useRef<string | null>(null)

  const siteKey = config.turnstileSiteKey
  // Sem a chave pública do site o desafio não existe: é o mesmo aviso, e o envio fica bloqueado.
  const unavailable = captchaRequired && (failed || !siteKey)

  return {
    required: captchaRequired,
    siteKey,
    unavailable,
    attempt,
    resets,
    ready: !captchaRequired || (token !== null && !unavailable),
    onToken(next: string | null) {
      unspent.current = next
      setToken(next)
      if (next !== null) setFailed(false)
    },
    onUnavailable() {
      setFailed(true)
    },
    retry() {
      setFailed(false)
      setAttempt((value) => value + 1)
    },
    /** Entrega a prova para o envio e pede outra: a Cloudflare só a aceita uma vez. */
    consume(): string | undefined {
      const used = unspent.current ?? undefined
      unspent.current = null
      setToken(null)
      setResets((value) => value + 1)
      return used
    },
  }
}

export type Captcha = ReturnType<typeof useCaptcha>
