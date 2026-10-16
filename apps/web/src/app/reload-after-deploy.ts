import { z } from 'zod'

// Uma aba aberta antes de uma publicação do site pode pedir um arquivo de código que deixou de
// existir (a tela de jogo é carregada sob demanda). O Vite avisa com `vite:preloadError`; o site
// recarrega a página uma vez, no mesmo endereço, e nunca em laço (feature 012, FR-024).

export const RELOAD_KEY = 'cruzadinha:reloaded-after-deploy'
const RETRY_WINDOW_MS = 30_000

const recordSchema = z.object({ path: z.string(), at: z.number() })

function parseRecord(stored: unknown): z.infer<typeof recordSchema> | null {
  if (typeof stored !== 'string') return null
  try {
    const parsed = recordSchema.safeParse(JSON.parse(stored))
    return parsed.success ? parsed.data : null
  } catch {
    return null
  }
}

export function shouldReloadAfterChunkError(previous: unknown, path: string, now: number): boolean {
  const record = parseRecord(previous)
  if (!record) return true
  return record.path !== path || now - record.at >= RETRY_WINDOW_MS
}

export function installReloadAfterDeploy(win: Window): void {
  win.addEventListener('vite:preloadError', (event) => {
    const path = win.location.pathname
    try {
      const previous = win.sessionStorage.getItem(RELOAD_KEY)
      if (!shouldReloadAfterChunkError(previous, path, Date.now())) return
      win.sessionStorage.setItem(RELOAD_KEY, JSON.stringify({ path, at: Date.now() }))
    } catch {
      // Sem sessionStorage não há como evitar um laço: deixa o erro aparecer como sempre.
      return
    }
    event.preventDefault()
    win.location.reload()
  })
}
