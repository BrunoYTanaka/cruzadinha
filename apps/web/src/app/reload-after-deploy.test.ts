import { describe, expect, it, vi } from 'vitest'
import {
  RELOAD_KEY,
  installReloadAfterDeploy,
  shouldReloadAfterChunkError,
} from './reload-after-deploy'

describe('shouldReloadAfterChunkError', () => {
  const now = 1_000_000

  it('reloads when there is no previous reload', () => {
    expect(shouldReloadAfterChunkError(null, '/jogo/1', now)).toBe(true)
  })

  it.each(['não é json', '{"at":1}', '{"path":"/jogo/1","at":"ontem"}'])(
    'reloads when the stored value is invalid (%s)',
    (stored) => {
      expect(shouldReloadAfterChunkError(stored, '/jogo/1', now)).toBe(true)
    },
  )

  it('does not reload twice on the same path within 30 s', () => {
    const stored = JSON.stringify({ path: '/jogo/1', at: now - 29_000 })
    expect(shouldReloadAfterChunkError(stored, '/jogo/1', now)).toBe(false)
  })

  it('reloads again after 30 s', () => {
    const stored = JSON.stringify({ path: '/jogo/1', at: now - 30_000 })
    expect(shouldReloadAfterChunkError(stored, '/jogo/1', now)).toBe(true)
  })

  it('reloads on another path', () => {
    const stored = JSON.stringify({ path: '/', at: now - 1_000 })
    expect(shouldReloadAfterChunkError(stored, '/jogo/1', now)).toBe(true)
  })
})

function fakeWindow(storage: Pick<Storage, 'getItem' | 'setItem'>) {
  const listeners: ((event: Event) => void)[] = []
  const reload = vi.fn()
  const win = {
    location: { pathname: '/jogo/1', reload },
    sessionStorage: storage,
    addEventListener: (_type: string, listener: (event: Event) => void) => listeners.push(listener),
  }
  const fire = () => {
    const event = new Event('vite:preloadError', { cancelable: true })
    for (const listener of listeners) listener(event)
    return event
  }
  return { win: win as unknown as Window, reload, fire }
}

function memoryStorage() {
  const data = new Map<string, string>()
  return {
    getItem: (key: string) => data.get(key) ?? null,
    setItem: (key: string, value: string) => void data.set(key, value),
    data,
  }
}

describe('installReloadAfterDeploy', () => {
  it('reloads once, then lets the error through', () => {
    const storage = memoryStorage()
    const { win, reload, fire } = fakeWindow(storage)
    installReloadAfterDeploy(win)

    const first = fire()
    expect(first.defaultPrevented).toBe(true)
    expect(reload).toHaveBeenCalledTimes(1)
    expect(storage.data.get(RELOAD_KEY)).toContain('/jogo/1')

    const second = fire()
    expect(second.defaultPrevented).toBe(false)
    expect(reload).toHaveBeenCalledTimes(1)
  })

  it('does not reload when sessionStorage is unavailable', () => {
    const { win, reload, fire } = fakeWindow({
      getItem: () => {
        throw new Error('bloqueado')
      },
      setItem: () => {
        throw new Error('bloqueado')
      },
    })
    installReloadAfterDeploy(win)
    expect(fire().defaultPrevented).toBe(false)
    expect(reload).not.toHaveBeenCalled()
  })
})
