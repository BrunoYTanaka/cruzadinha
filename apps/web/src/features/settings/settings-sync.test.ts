import type { SaveSettingsRequest, SettingsEnvelope } from '@cruzadinha/shared'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { ApiRequestError } from '../../api/client'
import { createSettingsSync, type SettingsSync } from './settings-sync'
import {
  getSettingsRecord,
  replaceSettings,
  settingsDefaults,
  subscribeSettings,
  updateSettings,
} from './settings-store'

type Api = {
  get: ReturnType<typeof vi.fn<() => Promise<SettingsEnvelope>>>
  save: ReturnType<typeof vi.fn<(body: SaveSettingsRequest) => Promise<SettingsEnvelope>>>
}

let api: Api
let sync: SettingsSync

const echo = (body: SaveSettingsRequest): Promise<SettingsEnvelope> =>
  Promise.resolve({ settings: body.settings, savedAt: body.savedAt })

function setup(envelope: SettingsEnvelope | Error = { settings: null, savedAt: null }) {
  api = {
    get: vi.fn(() =>
      envelope instanceof Error ? Promise.reject(envelope) : Promise.resolve(envelope),
    ),
    save: vi.fn(echo),
  }
  sync = createSettingsSync({ getSettings: api.get, saveSettings: api.save, debounceMs: 800 })
}

beforeEach(() => {
  vi.useFakeTimers()
  vi.setSystemTime(new Date('2026-10-21T12:00:00.000Z'))
})

afterEach(() => {
  sync.stop()
  vi.useRealTimers()
  window.localStorage.clear()
})

describe('mudanças da pessoa', () => {
  it('várias mudanças em 800 ms viram um PUT só, com a última versão', async () => {
    setup()
    await sync.start('open')
    api.save.mockClear()
    updateSettings({ theme: 'dark' })
    await vi.advanceTimersByTimeAsync(300)
    updateSettings({ helpLetters: 6 })
    await vi.advanceTimersByTimeAsync(799)
    expect(api.save).not.toHaveBeenCalled()
    await vi.advanceTimersByTimeAsync(1)
    expect(api.save).toHaveBeenCalledOnce()
    expect(api.save.mock.calls[0]?.[0]).toEqual(getSettingsRecord())
    expect(api.save.mock.calls[0]?.[0].settings).toMatchObject({ theme: 'dark', helpLetters: 6 })
  })

  it('copyClue vai no corpo do PUT (feature 032)', async () => {
    setup()
    await sync.start('open')
    api.save.mockClear()
    updateSettings({ copyClue: true })
    await vi.advanceTimersByTimeAsync(800)
    expect(api.save.mock.calls[0]?.[0].settings).toMatchObject({ copyClue: true })
  })

  it('mudanças de outra aba ou da conta não são enviadas', async () => {
    setup()
    await sync.start('open')
    api.save.mockClear()
    replaceSettings(
      { settings: { ...settingsDefaults(), theme: 'dark' }, savedAt: '2099-01-01T00:00:00.000Z' },
      'external',
    )
    await vi.advanceTimersByTimeAsync(2000)
    expect(api.save).not.toHaveBeenCalled()
  })
})

describe('falhas', () => {
  it('rede ou 5xx marcam o aviso e tentam de novo; o sucesso limpa o aviso', async () => {
    setup()
    await sync.start('open')
    api.save.mockReset()
    api.save
      .mockRejectedValueOnce(new ApiRequestError(0))
      .mockRejectedValueOnce(new ApiRequestError(503))
      .mockImplementation(echo)
    updateSettings({ theme: 'dark' })
    await vi.advanceTimersByTimeAsync(800)
    expect(sync.getStatus()).toBe('failing')
    await vi.advanceTimersByTimeAsync(1000)
    expect(sync.getStatus()).toBe('failing')
    await vi.advanceTimersByTimeAsync(2000)
    expect(api.save).toHaveBeenCalledTimes(3)
    expect(sync.getStatus()).toBe('ok')
  })

  it('429 espera o retry-after', async () => {
    setup()
    await sync.start('open')
    api.save.mockReset()
    api.save
      .mockRejectedValueOnce(new ApiRequestError(429, { retryAfterSeconds: 30 }))
      .mockImplementation(echo)
    updateSettings({ theme: 'dark' })
    await vi.advanceTimersByTimeAsync(800)
    await vi.advanceTimersByTimeAsync(29_000)
    expect(api.save).toHaveBeenCalledOnce()
    await vi.advanceTimersByTimeAsync(1_000)
    expect(api.save).toHaveBeenCalledTimes(2)
  })

  it('404 (API anterior) para sem aviso e sem novas tentativas (FR-025)', async () => {
    setup(new ApiRequestError(404))
    await sync.start('open')
    updateSettings({ theme: 'dark' })
    await vi.advanceTimersByTimeAsync(60_000)
    expect(api.save).not.toHaveBeenCalled()
    expect(sync.getStatus()).toBe('ok')
  })

  it('401 para a sincronização sem aviso', async () => {
    setup()
    await sync.start('open')
    api.save.mockReset()
    api.save.mockRejectedValue(new ApiRequestError(401))
    updateSettings({ theme: 'dark' })
    await vi.advanceTimersByTimeAsync(800)
    updateSettings({ theme: 'light' })
    await vi.advanceTimersByTimeAsync(60_000)
    expect(api.save).toHaveBeenCalledOnce()
    expect(sync.getStatus()).toBe('ok')
  })
})

describe('visitante', () => {
  it('sem start (visitante), nada é enviado (FR-021)', async () => {
    setup()
    updateSettings({ theme: 'dark' })
    await vi.advanceTimersByTimeAsync(5000)
    expect(api.get).not.toHaveBeenCalled()
    expect(api.save).not.toHaveBeenCalled()
  })

  it('depois de stop (saiu da conta), mantém o local e não envia (FR-020b)', async () => {
    setup()
    await sync.start('open')
    sync.stop()
    api.save.mockClear()
    updateSettings({ theme: 'dark' })
    await vi.advanceTimersByTimeAsync(5000)
    expect(api.save).not.toHaveBeenCalled()
    expect(getSettingsRecord().settings.theme).toBe('dark')
  })
})

describe('primeiro login (FR-020a)', () => {
  it('conta sem configurações recebe as do aparelho', async () => {
    updateSettings({ theme: 'dark' })
    setup({ settings: null, savedAt: null })
    await sync.start('login')
    expect(api.save).toHaveBeenCalledWith(getSettingsRecord())
  })

  it('conta com configurações substitui as do aparelho, mesmo mais antigas, com origem account', async () => {
    updateSettings({ theme: 'dark', helpLetters: 9 })
    setup({ settings: { theme: 'light' }, savedAt: '2026-01-01T00:00:00.000Z' })
    const origins: string[] = []
    const unsubscribe = subscribeSettings((_record, origin) => origins.push(origin))
    await sync.start('login')
    unsubscribe()
    // Campo ausente na resposta parcial é completado com o padrão do site.
    expect(getSettingsRecord().settings).toEqual({ ...settingsDefaults(), theme: 'light' })
    expect(origins).toEqual(['account'])
    expect(api.save).not.toHaveBeenCalled()
  })
})

describe('abertura já logado (FR-020c)', () => {
  it('conta mais nova substitui o local', async () => {
    updateSettings({ theme: 'dark' })
    setup({
      settings: { ...settingsDefaults(), theme: 'light' },
      savedAt: '2099-01-01T00:00:00.000Z',
    })
    await sync.start('open')
    expect(getSettingsRecord().settings.theme).toBe('light')
    expect(api.save).not.toHaveBeenCalled()
  })

  it('local mais novo é enviado e não é sobrescrito', async () => {
    updateSettings({ theme: 'dark' })
    setup({
      settings: { ...settingsDefaults(), theme: 'light' },
      savedAt: '2026-01-01T00:00:00.000Z',
    })
    await sync.start('open')
    expect(getSettingsRecord().settings.theme).toBe('dark')
    expect(api.save).toHaveBeenCalledWith(getSettingsRecord())
  })
})
