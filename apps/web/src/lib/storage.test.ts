import { afterEach, describe, expect, it, vi } from 'vitest'
import { readStorage, removeStorage, writeStorage } from './storage'

afterEach(() => {
  vi.restoreAllMocks()
  window.localStorage.clear()
  window.sessionStorage.clear()
})

describe('storage', () => {
  it('grava, lê e remove em localStorage e sessionStorage', () => {
    expect(writeStorage('a', '1')).toBe(true)
    expect(readStorage('a')).toBe('1')
    expect(writeStorage('b', '2', 'session')).toBe(true)
    expect(readStorage('b', 'session')).toBe('2')
    expect(readStorage('b')).toBeNull()
    removeStorage('a')
    expect(readStorage('a')).toBeNull()
  })

  it('devolve null e false quando o armazenamento lança exceção', () => {
    vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
      throw new Error('bloqueado')
    })
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('cheio')
    })
    vi.spyOn(Storage.prototype, 'removeItem').mockImplementation(() => {
      throw new Error('bloqueado')
    })
    expect(readStorage('a')).toBeNull()
    expect(writeStorage('a', '1')).toBe(false)
    expect(() => removeStorage('a')).not.toThrow()
  })

  it('devolve null quando o próprio acesso ao localStorage lança exceção', () => {
    vi.spyOn(window, 'localStorage', 'get').mockImplementation(() => {
      throw new Error('negado')
    })
    expect(readStorage('a')).toBeNull()
    expect(writeStorage('a', '1')).toBe(false)
  })
})
