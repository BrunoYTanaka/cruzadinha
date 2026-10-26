import { act, renderHook } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { useCountdown } from './useCountdown'

beforeEach(() => {
  vi.useFakeTimers()
})
afterEach(() => {
  vi.useRealTimers()
})

describe('useCountdown', () => {
  it('starts at zero and counts down the seconds it was given', () => {
    const { result } = renderHook(() => useCountdown())
    expect(result.current.secondsLeft).toBe(0)

    act(() => result.current.start(3))
    expect(result.current.secondsLeft).toBe(3)
    expect(result.current.total).toBe(3)

    act(() => {
      vi.advanceTimersByTime(1000)
    })
    expect(result.current.secondsLeft).toBe(2)
    act(() => {
      vi.advanceTimersByTime(2000)
    })
    expect(result.current.secondsLeft).toBe(0)
  })

  it('restarts with a new value from the API', () => {
    const { result } = renderHook(() => useCountdown())
    act(() => result.current.start(3))
    act(() => {
      vi.advanceTimersByTime(3000)
    })
    act(() => result.current.start(45))
    expect(result.current.secondsLeft).toBe(45)
    act(() => {
      vi.advanceTimersByTime(5000)
    })
    expect(result.current.secondsLeft).toBe(40)
  })
})
