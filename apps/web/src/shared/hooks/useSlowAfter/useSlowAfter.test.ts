import { act, renderHook } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { useSlowAfter } from './useSlowAfter'

describe('useSlowAfter', () => {
  beforeEach(() => vi.useFakeTimers())
  afterEach(() => vi.useRealTimers())

  it('fica lento só depois do atraso e conta segundos inteiros', () => {
    const { result } = renderHook(() => useSlowAfter(true))
    act(() => vi.advanceTimersByTime(1750))
    expect(result.current).toEqual({ slow: false, elapsedSeconds: 1 })
    act(() => vi.advanceTimersByTime(500))
    expect(result.current.slow).toBe(true)
    act(() => vi.advanceTimersByTime(3000))
    expect(result.current.elapsedSeconds).toBe(5)
  })

  it('respeita um atraso próprio', () => {
    const { result } = renderHook(() => useSlowAfter(true, 500))
    act(() => vi.advanceTimersByTime(500))
    expect(result.current.slow).toBe(true)
  })

  it('não conta enquanto inativo e recomeça do zero ao reativar', () => {
    const { result, rerender } = renderHook(({ on }) => useSlowAfter(on), {
      initialProps: { on: false },
    })
    act(() => vi.advanceTimersByTime(5000))
    expect(result.current).toEqual({ slow: false, elapsedSeconds: 0 })
    rerender({ on: true })
    act(() => vi.advanceTimersByTime(2000))
    expect(result.current.slow).toBe(true)
    rerender({ on: false })
    expect(result.current).toEqual({ slow: false, elapsedSeconds: 0 })
    rerender({ on: true })
    expect(result.current.slow).toBe(false)
  })

  it('limpa o timer ao desmontar', () => {
    const { unmount } = renderHook(() => useSlowAfter(true))
    unmount()
    expect(vi.getTimerCount()).toBe(0)
  })
})
