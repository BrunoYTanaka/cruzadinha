import { vi } from 'vitest'

type Listener = () => void

// Simula `window.matchMedia`: `matches(query)` decide quais media queries casam. Devolve uma
// função para trocar a regra e avisar quem estiver ouvindo, como quando a janela muda de tamanho.
export function mockMatchMedia(matches: (query: string) => boolean) {
  let current = matches
  const listeners = new Set<{ query: string; listener: Listener }>()
  vi.stubGlobal('matchMedia', (query: string) => ({
    get matches() {
      return current(query)
    },
    media: query,
    addEventListener: (_type: string, listener: Listener) => listeners.add({ query, listener }),
    removeEventListener: (_type: string, listener: Listener) => {
      for (const entry of listeners) if (entry.listener === listener) listeners.delete(entry)
    },
  }))
  return {
    change(next: (query: string) => boolean) {
      current = next
      for (const entry of [...listeners]) entry.listener()
    },
  }
}

// Computador: janela larga, sem teclado na tela.
export const desktop = (query: string) => query === '(min-width: 861px)'

// Celular: tela estreita e toque.
export const phone = (query: string) => query !== '(min-width: 861px)'
