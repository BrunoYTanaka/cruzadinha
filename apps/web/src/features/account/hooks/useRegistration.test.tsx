import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { renderHook, waitFor } from '@testing-library/react'
import type { ReactNode } from 'react'
import { describe, expect, it } from 'vitest'
import { jsonResponse, mockApi } from '../../../test/http'
import { useRegistration } from './useRegistration'

function wrapper({ children }: { children: ReactNode }) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return <QueryClientProvider client={client}>{children}</QueryClientProvider>
}

describe('useRegistration', () => {
  it('lê captchaRequired da API', async () => {
    mockApi({
      'GET /api/auth/registration': () => jsonResponse(200, { open: true, captchaRequired: true }),
    })
    const { result } = renderHook(() => useRegistration(), { wrapper })
    await waitFor(() => expect(result.current.isPending).toBe(false))
    expect(result.current).toEqual({ isOpen: true, isPending: false, captchaRequired: true })
  })

  it('uma API anterior, sem o campo, vale como sem captcha', async () => {
    mockApi({ 'GET /api/auth/registration': () => jsonResponse(200, { open: true }) })
    const { result } = renderHook(() => useRegistration(), { wrapper })
    await waitFor(() => expect(result.current.isPending).toBe(false))
    expect(result.current.captchaRequired).toBe(false)
  })
})
