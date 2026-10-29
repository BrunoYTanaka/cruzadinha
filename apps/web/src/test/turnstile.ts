import { act } from '@testing-library/react'
import { vi } from 'vitest'
import type {
  TurnstileApi,
  TurnstileOptions,
} from '../shared/components/Turnstile/turnstile-script'

// `window.turnstile` falso (feature 049): guarda as opções de cada widget e deixa o teste entregar
// a prova, vencê-la ou dar erro, como a Cloudflare faria. O `reset` não entrega prova nova sozinho.
export function installFakeTurnstile() {
  let count = 0
  const widgets = new Map<string, TurnstileOptions>()
  const api = {
    render: vi.fn((_container: HTMLElement, options: TurnstileOptions) => {
      const id = `widget-${++count}`
      widgets.set(id, options)
      return id
    }),
    reset: vi.fn(),
    remove: vi.fn((id: string) => {
      widgets.delete(id)
    }),
  } satisfies TurnstileApi
  window.turnstile = api

  const last = () => [...widgets.values()].at(-1)
  return {
    api,
    widgets,
    last,
    solve(token: string) {
      act(() => last()?.callback(token))
    },
    expire() {
      act(() => last()?.['expired-callback']())
    },
    fail() {
      act(() => last()?.['error-callback']())
    },
    uninstall() {
      delete window.turnstile
    },
  }
}
