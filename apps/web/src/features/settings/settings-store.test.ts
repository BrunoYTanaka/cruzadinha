import { defaultSettings } from '@cruzadinha/shared'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { config } from '../../config'
import {
  getSettingsRecord,
  replaceSettings,
  resetSettingsStore,
  restoreDefaults,
  SETTINGS_KEY,
  subscribeSettings,
  updateSettings,
} from './settings-store'

const defaults = defaultSettings(config.helpLimits)

function stored(): unknown {
  const raw = window.localStorage.getItem(SETTINGS_KEY)
  return raw === null ? null : (JSON.parse(raw) as unknown)
}

beforeEach(() => {
  window.localStorage.clear()
  resetSettingsStore()
})

afterEach(() => {
  vi.restoreAllMocks()
  window.localStorage.clear()
  resetSettingsStore()
})

describe('primeira leitura', () => {
  it('sem nada guardado vale o padrão', () => {
    expect(getSettingsRecord().settings).toEqual(defaults)
  })

  it('monta o conjunto a partir das chaves antigas e grava a chave nova sem apagar as antigas', () => {
    window.localStorage.setItem('cruzadinha:theme', 'dark')
    window.localStorage.setItem('cruzadinha:source', 'cruzadaonline')
    window.localStorage.setItem('cruzadinha:board-size', '{"cellSize":72}')
    window.localStorage.setItem('cruzadinha:library-width', '{"width":1200}')
    resetSettingsStore()

    expect(getSettingsRecord().settings).toEqual({
      ...defaults,
      theme: 'dark',
      defaultSource: 'cruzadaonline',
      boardCellSize: 72,
      libraryWidth: 1200,
    })
    expect(stored()).toMatchObject({ v: 1, settings: { theme: 'dark', boardCellSize: 72 } })
    expect(window.localStorage.getItem('cruzadinha:theme')).toBe('dark')
  })

  it('ignora chaves antigas inválidas', () => {
    window.localStorage.setItem('cruzadinha:theme', 'roxo')
    window.localStorage.setItem('cruzadinha:board-size', 'não é json')
    resetSettingsStore()
    expect(getSettingsRecord().settings).toEqual(defaults)
  })

  it('lê a chave nova, campo a campo', () => {
    window.localStorage.setItem(
      SETTINGS_KEY,
      JSON.stringify({
        v: 1,
        settings: { ...defaults, theme: 'light', helpLetters: 500 },
        savedAt: '2026-10-21T10:00:00.000Z',
      }),
    )
    resetSettingsStore()
    expect(getSettingsRecord()).toEqual({
      settings: { ...defaults, theme: 'light' },
      savedAt: '2026-10-21T10:00:00.000Z',
    })
  })

  it('com versão desconhecida ou JSON inválido usa as chaves antigas', () => {
    window.localStorage.setItem('cruzadinha:theme', 'dark')
    window.localStorage.setItem(SETTINGS_KEY, JSON.stringify({ v: 9, settings: {} }))
    resetSettingsStore()
    expect(getSettingsRecord().settings.theme).toBe('dark')

    window.localStorage.setItem(SETTINGS_KEY, '{')
    resetSettingsStore()
    expect(getSettingsRecord().settings.theme).toBe('dark')
  })
})

describe('mudanças', () => {
  it('updateSettings grava, troca o savedAt e avisa os inscritos', () => {
    const listener = vi.fn()
    const unsubscribe = subscribeSettings(listener)
    const before = getSettingsRecord().savedAt

    updateSettings({ helpLetters: 6 })

    const record = getSettingsRecord()
    expect(record.settings.helpLetters).toBe(6)
    expect(record.savedAt).not.toBe(before)
    expect(stored()).toMatchObject({ v: 1, settings: { helpLetters: 6 } })
    expect(listener).toHaveBeenCalledWith(record, 'user')
    unsubscribe()
  })

  it('restoreDefaults volta aos padrões com savedAt novo', () => {
    updateSettings({ theme: 'dark', helpWords: null })
    const before = getSettingsRecord().savedAt
    vi.spyOn(Date, 'now').mockReturnValue(new Date(before).getTime() + 1000)
    restoreDefaults()
    expect(getSettingsRecord().settings).toEqual(defaults)
    expect(getSettingsRecord().savedAt).not.toBe(before)
  })

  it('sem armazenamento, as mudanças valem em memória', () => {
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('bloqueado')
    })
    vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
      throw new Error('bloqueado')
    })
    resetSettingsStore()
    expect(getSettingsRecord().settings).toEqual(defaults)
    expect(() => updateSettings({ theme: 'dark' })).not.toThrow()
    expect(getSettingsRecord().settings.theme).toBe('dark')
  })
})

describe('registros de fora', () => {
  it('replaceSettings só aplica um registro mais novo', () => {
    updateSettings({ theme: 'dark' })
    const current = getSettingsRecord()
    const listener = vi.fn()
    subscribeSettings(listener)

    expect(
      replaceSettings(
        { settings: { ...defaults, theme: 'light' }, savedAt: '2000-01-01T00:00:00.000Z' },
        'account',
      ),
    ).toBe(false)
    expect(getSettingsRecord()).toEqual(current)

    const newer = new Date(new Date(current.savedAt).getTime() + 1000).toISOString()
    expect(
      replaceSettings({ settings: { ...defaults, theme: 'light' }, savedAt: newer }, 'account'),
    ).toBe(true)
    expect(getSettingsRecord().settings.theme).toBe('light')
    expect(listener).toHaveBeenCalledWith(getSettingsRecord(), 'account')
  })

  it('replaceSettings com force aplica mesmo um registro mais antigo', () => {
    updateSettings({ theme: 'dark' })
    expect(
      replaceSettings(
        { settings: { ...defaults, theme: 'light' }, savedAt: '2000-01-01T00:00:00.000Z' },
        'account',
        { force: true },
      ),
    ).toBe(true)
    expect(getSettingsRecord().settings.theme).toBe('light')
  })

  it('um evento storage da chave aplica o registro de outra aba', () => {
    getSettingsRecord()
    const listener = vi.fn()
    subscribeSettings(listener)
    const record = {
      v: 1,
      settings: { ...defaults, theme: 'dark' },
      savedAt: '2099-01-01T00:00:00.000Z',
    }
    window.localStorage.setItem(SETTINGS_KEY, JSON.stringify(record))
    window.dispatchEvent(new StorageEvent('storage', { key: SETTINGS_KEY }))

    expect(getSettingsRecord().settings.theme).toBe('dark')
    expect(listener).toHaveBeenCalledWith(getSettingsRecord(), 'external')
  })

  it('ignora eventos storage de outras chaves', () => {
    getSettingsRecord()
    const listener = vi.fn()
    subscribeSettings(listener)
    window.dispatchEvent(new StorageEvent('storage', { key: 'outra' }))
    expect(listener).not.toHaveBeenCalled()
  })
})
