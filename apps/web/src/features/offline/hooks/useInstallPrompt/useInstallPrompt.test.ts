import { act, renderHook } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { captureInstallPrompt, useInstallPrompt } from './useInstallPrompt'

function promptEvent() {
  const event = new Event('beforeinstallprompt', { cancelable: true }) as BeforeInstallPromptEvent
  Object.assign(event, { prompt: vi.fn(async () => undefined) })
  return event
}

let release: () => void
beforeEach(() => {
  window.matchMedia = vi.fn().mockReturnValue({ matches: false })
  release = captureInstallPrompt()
})
afterEach(() => release())

describe('useInstallPrompt', () => {
  it('é nulo sem o evento do navegador', () => {
    expect(renderHook(() => useInstallPrompt()).result.current).toBeNull()
  })

  it('expõe o convite depois de beforeinstallprompt, sem abri-lo sozinho', () => {
    const { result } = renderHook(() => useInstallPrompt())
    const event = promptEvent()
    act(() => {
      window.dispatchEvent(event)
    })
    expect(event.defaultPrevented).toBe(true)
    expect(event.prompt).not.toHaveBeenCalled()
    expect(result.current).toBeTypeOf('function')
  })

  it('abrir o convite o consome', async () => {
    const { result } = renderHook(() => useInstallPrompt())
    const event = promptEvent()
    act(() => {
      window.dispatchEvent(event)
    })
    await act(async () => {
      await result.current?.()
    })
    expect(event.prompt).toHaveBeenCalledOnce()
    expect(result.current).toBeNull()
  })

  it('some com appinstalled', () => {
    const { result } = renderHook(() => useInstallPrompt())
    act(() => {
      window.dispatchEvent(promptEvent())
    })
    act(() => {
      window.dispatchEvent(new Event('appinstalled'))
    })
    expect(result.current).toBeNull()
  })

  it('não oferece quando o site já roda instalado', () => {
    window.matchMedia = vi.fn().mockReturnValue({ matches: true })
    const { result } = renderHook(() => useInstallPrompt())
    act(() => {
      window.dispatchEvent(promptEvent())
    })
    expect(result.current).toBeNull()
  })
})
