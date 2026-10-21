import { afterEach, describe, expect, it, vi } from 'vitest'
import { startThemeTransition } from './theme-transition'

type Transition = { skipTransition: () => void; finished: Promise<void> }

function setStartViewTransition(value: unknown) {
  Object.defineProperty(document, 'startViewTransition', {
    value,
    configurable: true,
    writable: true,
  })
}

const startViewTransition = () =>
  (document as unknown as { startViewTransition: unknown }).startViewTransition

function mockReducedMotion(reduce: boolean) {
  vi.spyOn(window, 'matchMedia').mockImplementation(
    (query: string) =>
      ({
        matches: reduce && query.includes('prefers-reduced-motion'),
        media: query,
        onchange: null,
        addEventListener: () => {},
        removeEventListener: () => {},
        addListener: () => {},
        removeListener: () => {},
        dispatchEvent: () => false,
      }) as MediaQueryList,
  )
}

function mockViewTransition() {
  const transitions: (Transition & { skipTransition: ReturnType<typeof vi.fn> })[] = []
  setStartViewTransition(
    vi.fn((update: () => void) => {
      update()
      const transition = { skipTransition: vi.fn(), finished: new Promise<void>(() => {}) }
      transitions.push(transition)
      return transition
    }),
  )
  return transitions
}

afterEach(() => {
  vi.restoreAllMocks()
  Reflect.deleteProperty(document, 'startViewTransition')
  document.documentElement.style.removeProperty('--theme-x')
  document.documentElement.style.removeProperty('--theme-y')
})

describe('startThemeTransition', () => {
  it('sem suporte, aplica na hora', () => {
    if (!window.matchMedia) window.matchMedia = () => ({}) as MediaQueryList
    mockReducedMotion(false)
    const apply = vi.fn()
    startThemeTransition(apply, { x: 10, y: 20 })
    expect(apply).toHaveBeenCalledOnce()
  })

  it('com redução de movimento, aplica na hora sem chamar a transição', () => {
    if (!window.matchMedia) window.matchMedia = () => ({}) as MediaQueryList
    mockReducedMotion(true)
    mockViewTransition()
    const apply = vi.fn()
    startThemeTransition(apply, { x: 10, y: 20 })
    expect(apply).toHaveBeenCalledOnce()
    expect(startViewTransition()).not.toHaveBeenCalled()
  })

  it('com suporte, aplica dentro da transição e define a origem', () => {
    if (!window.matchMedia) window.matchMedia = () => ({}) as MediaQueryList
    mockReducedMotion(false)
    mockViewTransition()
    const apply = vi.fn()
    startThemeTransition(apply, { x: 120, y: 48 })
    expect(startViewTransition()).toHaveBeenCalledOnce()
    expect(apply).toHaveBeenCalledOnce()
    expect(document.documentElement.style.getPropertyValue('--theme-x')).toBe('120px')
    expect(document.documentElement.style.getPropertyValue('--theme-y')).toBe('48px')
  })

  it('uma segunda troca durante a primeira pula a anterior', () => {
    if (!window.matchMedia) window.matchMedia = () => ({}) as MediaQueryList
    mockReducedMotion(false)
    const transitions = mockViewTransition()
    startThemeTransition(vi.fn(), { x: 0, y: 0 })
    startThemeTransition(vi.fn(), { x: 0, y: 0 })
    expect(transitions[0]?.skipTransition).toHaveBeenCalledOnce()
    expect(transitions[1]?.skipTransition).not.toHaveBeenCalled()
  })
})
