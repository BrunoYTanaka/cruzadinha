import { act, renderHook } from '@testing-library/react'
import { afterEach, describe, expect, it } from 'vitest'
import { useOnline } from './useOnline'

const setOnline = (value: boolean) =>
  Object.defineProperty(navigator, 'onLine', { value, configurable: true })

afterEach(() => setOnline(true))

describe('useOnline', () => {
  it('starts from navigator.onLine', () => {
    setOnline(false)
    expect(renderHook(() => useOnline()).result.current).toBe(false)
  })

  it('follows the online and offline events', () => {
    const { result } = renderHook(() => useOnline())
    expect(result.current).toBe(true)
    act(() => {
      setOnline(false)
      window.dispatchEvent(new Event('offline'))
    })
    expect(result.current).toBe(false)
    act(() => {
      setOnline(true)
      window.dispatchEvent(new Event('online'))
    })
    expect(result.current).toBe(true)
  })
})
