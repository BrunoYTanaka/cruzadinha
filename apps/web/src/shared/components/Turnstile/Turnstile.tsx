import type { CaptchaAction } from '@cruzadinha/shared'
import { useEffect, useRef, useState } from 'react'
import { loadTurnstile } from './turnstile-script'

type Props = {
  siteKey: string
  action: CaptchaAction
  /** A prova nova, ou `null` quando a anterior venceu, deu erro ou foi descartada. */
  onToken: (token: string | null) => void
  /** O script ou o desafio não funcionou: o formulário mostra o aviso com "Tentar de novo". */
  onUnavailable: () => void
  /** Cada aumento pede uma prova nova (`turnstile.reset`): a anterior foi usada. */
  resetSignal?: number
}

// O desafio acompanha o tema do site (`data-theme`), não só o do sistema.
function readTheme(): 'light' | 'dark' {
  const chosen = document.documentElement.getAttribute('data-theme')
  if (chosen === 'light' || chosen === 'dark') return chosen
  return window.matchMedia?.('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
}

// Widget do Turnstile por `turnstile.render` (renderização explícita), invisível até a Cloudflare
// pedir interação. Uma `action` por tela; a troca de tema o renderiza de novo.
export function Turnstile({ siteKey, action, onToken, onUnavailable, resetSignal = 0 }: Props) {
  const container = useRef<HTMLDivElement>(null)
  const widgetId = useRef<string | null>(null)
  const callbacks = useRef({ onToken, onUnavailable })
  const lastReset = useRef(resetSignal)
  const [theme, setTheme] = useState(readTheme)

  useEffect(() => {
    callbacks.current = { onToken, onUnavailable }
  })

  useEffect(() => {
    if (lastReset.current === resetSignal) return
    lastReset.current = resetSignal
    if (widgetId.current) window.turnstile?.reset(widgetId.current)
  }, [resetSignal])

  useEffect(() => {
    const update = () => setTheme(readTheme())
    const observer = new MutationObserver(update)
    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ['data-theme'],
    })
    const media = window.matchMedia?.('(prefers-color-scheme: dark)')
    media?.addEventListener('change', update)
    return () => {
      observer.disconnect()
      media?.removeEventListener('change', update)
    }
  }, [])

  useEffect(() => {
    let cancelled = false
    loadTurnstile().then(
      (api) => {
        if (cancelled || !container.current) return
        callbacks.current.onToken(null)
        widgetId.current = api.render(container.current, {
          sitekey: siteKey,
          action,
          appearance: 'interaction-only',
          language: 'pt-br',
          theme,
          callback: (token) => callbacks.current.onToken(token),
          'expired-callback': () => callbacks.current.onToken(null),
          'timeout-callback': () => callbacks.current.onToken(null),
          'error-callback': () => {
            callbacks.current.onToken(null)
            callbacks.current.onUnavailable()
          },
        })
      },
      () => {
        if (!cancelled) callbacks.current.onUnavailable()
      },
    )
    return () => {
      cancelled = true
      if (widgetId.current) window.turnstile?.remove(widgetId.current)
      widgetId.current = null
    }
  }, [siteKey, action, theme])

  return <div ref={container} />
}
