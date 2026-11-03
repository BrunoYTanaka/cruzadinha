import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { renderHook, waitFor } from '@testing-library/react'
import type { ReactNode } from 'react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { apiError, jsonResponse, mockApi } from '../../../test/http'
import { fetchVisibleSources } from '../../services/api/visible-sources/visible-sources'
import { useVisibleSources } from './useVisibleSources'

function wrapper(client: QueryClient) {
  return ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={client}>{children}</QueryClientProvider>
  )
}

const newClient = () => new QueryClient({ defaultOptions: { queries: { gcTime: Infinity } } })

afterEach(() => {
  vi.useRealTimers()
  vi.unstubAllGlobals()
})

describe('useVisibleSources', () => {
  it('has no list while loading, then the visible sources in order', async () => {
    mockApi({
      'GET /api/sources': () => jsonResponse(200, { sources: ['clube', 'oglobo'] }),
    })
    const { result } = renderHook(() => useVisibleSources(), { wrapper: wrapper(newClient()) })
    expect(result.current.isPending).toBe(true)
    await waitFor(() => expect(result.current.isPending).toBe(false))
    expect(result.current.sources).toEqual(['clube', 'oglobo'])
    expect(result.current.defaultSource).toBe('clube')
  })

  it('falls back to every source on a 404 (older API) or an error', async () => {
    mockApi({ 'GET /api/sources': () => apiError(404, 'puzzle-unavailable') })
    const { result } = renderHook(() => useVisibleSources(), { wrapper: wrapper(newClient()) })
    await waitFor(() => expect(result.current.isPending).toBe(false))
    expect(result.current.sources).toEqual(['oglobo', 'cruzadaonline', 'cruzadasbrasil', 'clube'])
    expect(result.current.defaultSource).toBe('oglobo')
  })

  it('asks again after 30 seconds (FR-015)', async () => {
    const { fetch } = mockApi({
      'GET /api/sources': () => jsonResponse(200, { sources: ['oglobo'] }),
    })
    const client = newClient()
    await fetchVisibleSources(client)
    await fetchVisibleSources(client)
    expect(fetch).toHaveBeenCalledTimes(1)
    vi.useFakeTimers({ toFake: ['Date'] })
    vi.setSystemTime(Date.now() + 31_000)
    await fetchVisibleSources(client)
    expect(fetch).toHaveBeenCalledTimes(2)
  })
})

describe('fetchVisibleSources (loaders, no hook)', () => {
  it('uses the same cache and falls back to every source on error', async () => {
    mockApi({ 'GET /api/sources': () => apiError(404, 'puzzle-unavailable') })
    expect(await fetchVisibleSources(newClient())).toEqual([
      'oglobo',
      'cruzadaonline',
      'cruzadasbrasil',
      'clube',
    ])
  })
})
