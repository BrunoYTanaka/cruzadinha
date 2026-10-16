import { screen, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { resetServerWake } from '../api/server-wake'
import { jsonResponse, mockApi } from '../test/http'
import { aUser, makeQueryClient, renderRoutes, resetSessionHandlers } from '../test/render'
import { createAppRoutes } from './router'

const healthUp = () => jsonResponse(200, { status: 'ok', database: 'up' })
const withSession = () => jsonResponse(200, { user: aUser })

function renderApp(path: string) {
  const queryClient = makeQueryClient()
  return renderRoutes(createAppRoutes(queryClient), [path], queryClient)
}

beforeEach(() => {
  resetServerWake()
})

afterEach(() => {
  resetSessionHandlers()
  resetServerWake()
  vi.unstubAllGlobals()
})

describe('entrada do site com a espera do servidor', () => {
  it('mostra o layout com a espera no lugar do conteúdo enquanto o servidor não responde', async () => {
    mockApi({ 'GET /api/health': () => new Promise<Response>(() => {}) })
    renderApp('/login')
    expect(await screen.findByRole('link', { name: 'Cruzadinha' })).toBeInTheDocument()
    expect(screen.getByRole('status')).toHaveTextContent('Carregando…')
    expect(screen.queryByRole('heading', { name: 'Entrar' })).not.toBeInTheDocument()
  })

  it('consulta o health antes da sessão', async () => {
    const { calls } = mockApi({
      'GET /api/health': healthUp,
      'GET /api/auth/me': withSession,
      'GET /api/library': () => jsonResponse(200, { items: [] }),
    })
    renderApp('/')
    await waitFor(() => expect(calls.some((call) => call.key === 'GET /api/auth/me')).toBe(true))
    const keys = calls.map((call) => call.key)
    expect(keys[0]).toBe('GET /api/health')
    expect(keys.indexOf('GET /api/health')).toBeLessThan(keys.indexOf('GET /api/auth/me'))
  })

  it('não espera o health na página de status', async () => {
    mockApi({ 'GET /api/health': () => new Promise<Response>(() => {}) })
    renderApp('/status')
    expect(await screen.findByRole('heading', { name: 'Cruzadinha' })).toBeInTheDocument()
  })

  it('preserva o endereço pedido depois da espera', async () => {
    mockApi({ 'GET /api/health': healthUp, 'GET /api/auth/me': withSession })
    const { router } = renderApp('/dia/2026-10-01?x=1')
    await waitFor(() => expect(router.state.navigation.state).toBe('idle'))
    await waitFor(() => expect(router.state.location.pathname).toBe('/dia/2026-10-01'))
    expect(router.state.location.search).toBe('?x=1')
  })

  it('não consulta o health de novo ao navegar depois de pronto', async () => {
    const { calls } = mockApi({
      'GET /api/health': healthUp,
      'GET /api/auth/me': withSession,
      'GET /api/library': () => jsonResponse(200, { items: [] }),
    })
    const { router } = renderApp('/')
    await waitFor(() => expect(calls.some((call) => call.key === 'GET /api/auth/me')).toBe(true))
    await router.navigate('/dia/2026-10-01?outro=1')
    await waitFor(() => expect(router.state.location.search).toBe('?outro=1'))
    expect(calls.filter((call) => call.key === 'GET /api/health')).toHaveLength(1)
  })
})
