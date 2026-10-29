const SCRIPT_URL = 'https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit'
const LOAD_TIMEOUT_MS = 10_000

export type TurnstileOptions = {
  sitekey: string
  action: string
  appearance: 'interaction-only'
  language: string
  theme: 'light' | 'dark'
  callback: (token: string) => void
  'expired-callback': () => void
  'error-callback': () => void
  'timeout-callback': () => void
}

export type TurnstileApi = {
  render(container: HTMLElement, options: TurnstileOptions): string
  reset(widgetId: string): void
  remove(widgetId: string): void
}

declare global {
  interface Window {
    turnstile?: TurnstileApi
  }
}

let loading: Promise<TurnstileApi> | null = null

// Pede o script uma vez; uma falha esquece a tentativa para "Tentar de novo" poder pedir outra.
export function loadTurnstile(): Promise<TurnstileApi> {
  if (window.turnstile) return Promise.resolve(window.turnstile)
  if (loading) return loading
  loading = new Promise<TurnstileApi>((resolve, reject) => {
    const script = document.createElement('script')
    const fail = () => {
      clearTimeout(timer)
      script.remove()
      loading = null
      reject(new Error('turnstile-unavailable'))
    }
    const timer = setTimeout(fail, LOAD_TIMEOUT_MS)
    script.src = SCRIPT_URL
    script.async = true
    script.onerror = fail
    script.onload = () => {
      clearTimeout(timer)
      if (window.turnstile) resolve(window.turnstile)
      else fail()
    }
    document.head.append(script)
  })
  return loading
}
