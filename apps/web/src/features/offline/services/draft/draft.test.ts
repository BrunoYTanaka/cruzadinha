import { afterEach, describe, expect, it, vi } from 'vitest'
import { clearDraft, draftKey, listDrafts, loadDraft, saveDraft } from './draft'

const cells = [
  ['A', null],
  [null, 'Ç'],
]

afterEach(() => {
  vi.restoreAllMocks()
  window.localStorage.clear()
})

describe('draft', () => {
  it('grava e lê o rascunho por dono e cruzada', () => {
    saveDraft('u1', 'p1', cells)
    expect(loadDraft('u1', 'p1')).toEqual(cells)
    expect(loadDraft('guest', 'p1')).toBeNull()
    expect(loadDraft('u1', 'p2')).toBeNull()
  })

  it('rascunho vazio remove a chave', () => {
    saveDraft('u1', 'p1', cells)
    saveDraft('u1', 'p1', [[null], [null]])
    expect(window.localStorage.getItem(draftKey('u1', 'p1'))).toBeNull()
  })

  it('valor inválido é ignorado e removido', () => {
    for (const raw of ['nope', '{"v":2,"cells":[]}', '{"v":1,"cells":[["a"]]}']) {
      window.localStorage.setItem(draftKey('u1', 'p1'), raw)
      expect(loadDraft('u1', 'p1')).toBeNull()
      expect(window.localStorage.getItem(draftKey('u1', 'p1'))).toBeNull()
    }
  })

  it('lista os rascunhos de todos os donos e apaga um', () => {
    saveDraft('u1', 'p1', cells)
    saveDraft('guest', 'p2', cells)
    expect(listDrafts()).toEqual(
      expect.arrayContaining([
        { owner: 'u1', puzzleId: 'p1' },
        { owner: 'guest', puzzleId: 'p2' },
      ]),
    )
    clearDraft('u1', 'p1')
    expect(listDrafts()).toEqual([{ owner: 'guest', puzzleId: 'p2' }])
  })

  it('nunca lança sem armazenamento', () => {
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('cheio')
    })
    expect(() => saveDraft('u1', 'p1', cells)).not.toThrow()
  })
})
