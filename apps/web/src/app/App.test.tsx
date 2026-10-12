import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { App } from './App'

function renderApp() {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return render(
    <QueryClientProvider client={queryClient}>
      <App />
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

describe('App', () => {
  it('shows the project name', () => {
    respondWith({ status: 'ok', database: 'up' })
    renderApp()
    expect(screen.getByRole('heading', { name: 'Cruzadinha' })).toBeInTheDocument()
  })

  it('shows the server and the database available', async () => {
    respondWith({ status: 'ok', database: 'up' })
    renderApp()
    expect(await screen.findByText('Servidor: disponível')).toBeInTheDocument()
    expect(screen.getByText('Banco: disponível')).toBeInTheDocument()
  })

  it('shows the database unavailable', async () => {
    respondWith({ status: 'ok', database: 'down' })
    renderApp()
    expect(await screen.findByText('Servidor: disponível')).toBeInTheDocument()
    expect(screen.getByText('Banco: indisponível')).toBeInTheDocument()
  })

  it('shows the server unavailable when the request fails', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => {
        throw new TypeError('network')
      }),
    )
    renderApp()
    expect(await screen.findByText('Servidor: indisponível')).toBeInTheDocument()
  })

  it('shows the server unavailable when the body is invalid', async () => {
    respondWith({ status: 'broken' })
    renderApp()
    expect(await screen.findByText('Servidor: indisponível')).toBeInTheDocument()
  })
})
