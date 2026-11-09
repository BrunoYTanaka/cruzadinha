import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, screen, waitFor } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { StatusPage } from './StatusPage'

function renderApp() {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return render(
    <QueryClientProvider client={queryClient}>
      <StatusPage />
    </QueryClientProvider>,
  )
}

function respondWith(body: unknown) {
  vi.stubGlobal(
    'fetch',
    vi.fn(async () => new Response(JSON.stringify(body), { status: 200 })),
  )
}

afterEach(() => {
  vi.unstubAllGlobals()
})

describe('StatusPage', () => {
  it('shows the project name', () => {
    respondWith({ status: 'ok', database: 'up' })
    renderApp()
    expect(screen.getByRole('heading', { name: 'Cruzadinha' })).toBeInTheDocument()
  })

  it('shows the server and the database available', async () => {
    respondWith({ status: 'ok', database: 'up' })
    renderApp()
    await waitFor(() =>
      expect(screen.getByRole('group', { name: 'Servidor' })).toHaveTextContent('disponível'),
    )
    expect(screen.getByRole('group', { name: 'Banco' })).toHaveTextContent('✓ disponível')
  })

  it('shows the database unavailable', async () => {
    respondWith({ status: 'ok', database: 'down' })
    renderApp()
    await waitFor(() =>
      expect(screen.getByRole('group', { name: 'Servidor' })).toHaveTextContent('disponível'),
    )
    expect(screen.getByRole('group', { name: 'Banco' })).toHaveTextContent('✕ indisponível')
  })

  it('shows the server unavailable when the request fails', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => {
        throw new TypeError('network')
      }),
    )
    renderApp()
    await waitFor(() =>
      expect(screen.getByRole('group', { name: 'Servidor' })).toHaveTextContent('indisponível'),
    )
  })

  it('shows the server unavailable when the body is invalid', async () => {
    respondWith({ status: 'broken' })
    renderApp()
    await waitFor(() =>
      expect(screen.getByRole('group', { name: 'Servidor' })).toHaveTextContent('indisponível'),
    )
  })
})
