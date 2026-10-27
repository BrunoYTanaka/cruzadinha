import { afterEach, describe, expect, it, vi } from 'vitest'
import { loadPencil, savePencil } from './pencil-preference'

afterEach(() => {
  vi.restoreAllMocks()
  window.localStorage.clear()
})

describe('pencil-preference', () => {
  it('começa desligado, liga e desliga', () => {
    expect(loadPencil()).toBe(false)
    savePencil(true)
    expect(loadPencil()).toBe(true)
    expect(window.localStorage.getItem('cruzadinha:pencil')).toBe('1')
    savePencil(false)
    expect(loadPencil()).toBe(false)
    expect(window.localStorage.getItem('cruzadinha:pencil')).toBeNull()
  })

  it('nunca lança sem armazenamento', () => {
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('cheio')
    })
    expect(() => savePencil(true)).not.toThrow()
  })
})
