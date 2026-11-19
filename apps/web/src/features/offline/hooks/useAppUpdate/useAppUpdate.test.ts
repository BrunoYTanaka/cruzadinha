import { act, renderHook } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { registerSW } from 'virtual:pwa-register'
import { installAppUpdate, useAppUpdate, type AppUpdateWindow } from './useAppUpdate'

type Options = NonNullable<Parameters<typeof registerSW>[0]>

function setup(online = true) {
  const updateSW = vi.fn(() => Promise.resolve())
  let options: Options = {}
  const register = vi.fn((o?: Options) => {
    options = o ?? {}
    return updateSW
  }) as unknown as typeof registerSW
  const reload = vi.fn()
  const doc = Object.assign(new EventTarget(), {
    visibilityState: 'hidden' as DocumentVisibilityState,
  })
  const win: AppUpdateWindow = {
    location: { reload },
    setTimeout: (handler, ms) => globalThis.setTimeout(handler, ms) as unknown as number,
    clearTimeout: (id) => globalThis.clearTimeout(id),
    document: doc,
    navigator: { onLine: online },
  }
  const cleanup = installAppUpdate(register, win)
  return { register, options: () => options, updateSW, reload, doc, win, cleanup }
}

describe('useAppUpdate', () => {
  let cleanup = () => {}
  beforeEach(() => {
    vi.useFakeTimers()
  })
  afterEach(() => {
    cleanup()
    vi.useRealTimers()
  })

  it('começa em none e vai a waiting com onNeedRefresh', () => {
    const s = setup()
    cleanup = s.cleanup
    const { result } = renderHook(() => useAppUpdate())
    expect(result.current.status).toBe('none')
    expect(s.register).toHaveBeenCalledWith(expect.objectContaining({ immediate: true }))
    act(() => s.options().onNeedRefresh?.())
    expect(result.current.status).toBe('waiting')
  })

  it('update chama updateSW uma vez e recarrega só depois de onNeedReload', () => {
    const s = setup()
    cleanup = s.cleanup
    const { result } = renderHook(() => useAppUpdate())
    act(() => s.options().onNeedRefresh?.())
    act(() => result.current.update())
    act(() => result.current.update())
    expect(result.current.status).toBe('updating')
    expect(s.updateSW).toHaveBeenCalledTimes(1)
    act(() => s.options().onNeedReload?.())
    expect(s.reload).toHaveBeenCalledTimes(1)
  })

  it('onNeedReload sem update antes não recarrega (FR-008)', () => {
    const s = setup()
    cleanup = s.cleanup
    act(() => s.options().onNeedRefresh?.())
    act(() => s.options().onNeedReload?.())
    expect(s.reload).not.toHaveBeenCalled()
  })

  it('recarrega após 10 s sem onNeedReload (FR-005)', () => {
    const s = setup()
    cleanup = s.cleanup
    const { result } = renderHook(() => useAppUpdate())
    act(() => s.options().onNeedRefresh?.())
    act(() => result.current.update())
    act(() => void vi.advanceTimersByTime(10_000))
    expect(s.reload).toHaveBeenCalledTimes(1)
  })

  it('dismiss esconde, resiste a novo onNeedRefresh e bloqueia update; novo carregamento volta a waiting', () => {
    const s = setup()
    const { result } = renderHook(() => useAppUpdate())
    act(() => s.options().onNeedRefresh?.())
    act(() => result.current.dismiss())
    expect(result.current.status).toBe('dismissed')
    act(() => s.options().onNeedRefresh?.())
    expect(result.current.status).toBe('dismissed')
    act(() => result.current.update())
    expect(s.updateSW).not.toHaveBeenCalled()
    act(() => s.cleanup())
    const again = setup()
    cleanup = again.cleanup
    act(() => again.options().onNeedRefresh?.())
    expect(result.current.status).toBe('waiting')
  })

  describe('procura versão ao voltar à aba (FR-010)', () => {
    function registered(s: ReturnType<typeof setup>, reg: Partial<ServiceWorkerRegistration>) {
      const update = vi.fn(() => Promise.resolve())
      s.options().onRegisteredSW?.('/sw.js', { update, ...reg } as ServiceWorkerRegistration)
      return update
    }
    const show = (s: ReturnType<typeof setup>, state: DocumentVisibilityState) => {
      Object.assign(s.doc, { visibilityState: state })
      s.doc.dispatchEvent(new Event('visibilitychange'))
    }

    it('chama update ao ficar visível', () => {
      const s = setup()
      cleanup = s.cleanup
      const update = registered(s, {})
      show(s, 'visible')
      expect(update).toHaveBeenCalledTimes(1)
    })

    it('não chama escondida, instalando, sem rede ou sem registro', () => {
      const s = setup()
      cleanup = s.cleanup
      const update = registered(s, { installing: {} as ServiceWorker })
      show(s, 'hidden')
      show(s, 'visible')
      expect(update).not.toHaveBeenCalled()
      cleanup()
      const offline = setup(false)
      cleanup = offline.cleanup
      const offlineUpdate = registered(offline, {})
      show(offline, 'visible')
      expect(offlineUpdate).not.toHaveBeenCalled()
      offline.options().onRegisteredSW?.('/sw.js', undefined)
      show(offline, 'visible')
    })
  })
})
