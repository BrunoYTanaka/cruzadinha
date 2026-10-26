import { afterEach, describe, expect, it, vi } from 'vitest'
import { clearHelp, helpKey, loadHelp, saveHelp } from './help-storage'

const snapshot = {
  usage: { letters: 1, words: 2 },
  marks: { '0,1': 'helped', '1,1': 'wrong' } as const,
  locked: ['0,1'],
}

afterEach(() => {
  vi.restoreAllMocks()
  window.localStorage.clear()
})

describe('help-storage', () => {
  it('grava e lê contadores, marcas e células travadas', () => {
    saveHelp('u1', 'p1', snapshot)
    expect(loadHelp('u1', 'p1')).toEqual(snapshot)
    expect(window.localStorage.getItem(helpKey('u1', 'p1'))).not.toBeNull()
  })

  it('duas contas no mesmo aparelho não se misturam', () => {
    saveHelp('u1', 'p1', snapshot)
    expect(loadHelp('u2', 'p1')).toBeNull()
    expect(loadHelp('u1', 'p2')).toBeNull()
  })

  it('apagar ("jogar de novo") remove o registro', () => {
    saveHelp('u1', 'p1', snapshot)
    clearHelp('u1', 'p1')
    expect(loadHelp('u1', 'p1')).toBeNull()
  })

  it('registro corrompido ou fora do formato é ignorado', () => {
    window.localStorage.setItem(helpKey('u1', 'p1'), '{nope')
    expect(loadHelp('u1', 'p1')).toBeNull()
    window.localStorage.setItem(helpKey('u1', 'p1'), JSON.stringify({ usage: 'x' }))
    expect(loadHelp('u1', 'p1')).toBeNull()
  })

  it('sem armazenamento a aplicação segue', () => {
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('cheio')
    })
    vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
      throw new Error('bloqueado')
    })
    expect(() => saveHelp('u1', 'p1', snapshot)).not.toThrow()
    expect(loadHelp('u1', 'p1')).toBeNull()
  })
})
