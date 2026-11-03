import { puzzleSourceIdSchema } from '@cruzadinha/shared'
import { QueryClientProvider } from '@tanstack/react-query'
import { renderHook } from '@testing-library/react'
import type { ReactNode } from 'react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import {
  getSettings,
  resetSettingsStore,
  updateSettings,
} from '../../../shared/services/settings-store/settings-store'
import { makeQueryClient } from '../../../test/render'
import {
  DEFAULT_SOURCE,
  clearRememberedSource,
  loadSourceChoice,
  rememberGameSource,
  saveSourceChoice,
  useSourceChoice,
} from './source-choice'

// O hook lê a lista de fontes visíveis (feature 060): precisa de um QueryClient.
function withClient() {
  const client = makeQueryClient()
  return ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={client}>{children}</QueryClientProvider>
  )
}

afterEach(() => {
  vi.restoreAllMocks()
  clearRememberedSource()
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

describe('aba do calendário ao voltar de um jogo (feature 031)', () => {
  it('começa na fonte do jogo de onde a pessoa saiu', () => {
    rememberGameSource('cruzadaonline')
    const { result } = renderHook(() => useSourceChoice(), { wrapper: withClient() })
    expect(result.current[0]).toBe('cruzadaonline')
  })

  it('sem jogo lembrado começa na cruzada padrão', () => {
    saveSourceChoice('cruzadaonline')
    const { result } = renderHook(() => useSourceChoice(), { wrapper: withClient() })
    expect(result.current[0]).toBe('cruzadaonline')
    clearRememberedSource()
    saveSourceChoice('oglobo')
    expect(renderHook(() => useSourceChoice(), { wrapper: withClient() }).result.current[0]).toBe(
      'oglobo',
    )
  })

  it('fonte desconhecida não é lembrada e vale a cruzada padrão', () => {
    rememberGameSource('nova-fonte')
    expect(renderHook(() => useSourceChoice(), { wrapper: withClient() }).result.current[0]).toBe(
      DEFAULT_SOURCE,
    )
  })

  it('lembrar a fonte ou trocar de aba não grava nas configurações', () => {
    rememberGameSource('cruzadaonline')
    expect(getSettings().defaultSource).toBe(DEFAULT_SOURCE)
  })
})

describe('resolveSource (feature 060)', () => {
  it('keeps a visible choice and falls back to the first visible one otherwise', async () => {
    const { resolveSource } = await import('./source-choice')
    expect(resolveSource('clube', ['oglobo', 'clube'])).toBe('clube')
    expect(resolveSource('cruzadaonline', ['clube', 'oglobo'])).toBe('clube')
  })
})
