import { puzzleSourceIdSchema } from '@cruzadinha/shared'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { getSettings, resetSettingsStore, updateSettings } from '../settings/settings-store'
import { DEFAULT_SOURCE, loadSourceChoice, saveSourceChoice } from './source-choice'

afterEach(() => {
  vi.restoreAllMocks()
  window.localStorage.clear()
})

describe('cruzada padrão (feature 021)', () => {
  it('sem valor guardado vale O Globo', () => {
    expect(loadSourceChoice()).toBe('oglobo')
  })

  it('a fonte padrão é a primeira da lista de fontes', () => {
    expect(DEFAULT_SOURCE).toBe(puzzleSourceIdSchema.options[0])
  })

  it('lê e grava a cruzada padrão nas configurações', () => {
    saveSourceChoice('cruzadaonline')
    expect(getSettings().defaultSource).toBe('cruzadaonline')
    expect(loadSourceChoice()).toBe('cruzadaonline')
  })

  it('fonte desconhecida vale como a primeira, sem regravar o valor (FR-012b)', () => {
    updateSettings({ defaultSource: 'nova-fonte' })
    expect(loadSourceChoice()).toBe(DEFAULT_SOURCE)
    expect(getSettings().defaultSource).toBe('nova-fonte')
  })

  it('migra a escolha antiga cruzadinha:source', () => {
    window.localStorage.setItem('cruzadinha:source', 'cruzadaonline')
    resetSettingsStore()
    expect(loadSourceChoice()).toBe('cruzadaonline')
  })

  it.each(['publico', '{"source":"oglobo"', ''])(
    'escolha antiga inválida (%s) vale O Globo',
    (value) => {
      window.localStorage.setItem('cruzadinha:source', value)
      resetSettingsStore()
      expect(loadSourceChoice()).toBe('oglobo')
    },
  )

  it('armazenamento que lança não quebra a leitura nem a gravação', () => {
    vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
      throw new Error('bloqueado')
    })
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('bloqueado')
    })
    resetSettingsStore()
    expect(() => saveSourceChoice('cruzadaonline')).not.toThrow()
    expect(loadSourceChoice()).toBe('cruzadaonline')
  })
})
