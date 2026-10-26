import { renderHook } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { desktop, mockMatchMedia, phone } from '../../../test/media'
import { ON_SCREEN_KEYBOARD_QUERY } from './useOnScreenKeyboard'
import { DESKTOP_LAYOUT_QUERY, useDesktopLayout } from './useDesktopLayout'

afterEach(() => {
  vi.unstubAllGlobals()
})

describe('useDesktopLayout', () => {
  it('vale com janela larga e sem teclado na tela', () => {
    mockMatchMedia(desktop)
    expect(renderHook(() => useDesktopLayout()).result.current).toBe(true)
  })

  it('não vale com ponteiro grosseiro, mesmo numa janela larga', () => {
    mockMatchMedia((query) => query === DESKTOP_LAYOUT_QUERY || query === ON_SCREEN_KEYBOARD_QUERY)
    expect(renderHook(() => useDesktopLayout()).result.current).toBe(false)
  })

  it('não vale no celular', () => {
    mockMatchMedia(phone)
    expect(renderHook(() => useDesktopLayout()).result.current).toBe(false)
  })

  it('não vale sem matchMedia', () => {
    vi.stubGlobal('matchMedia', undefined)
    expect(renderHook(() => useDesktopLayout()).result.current).toBe(false)
  })
})
