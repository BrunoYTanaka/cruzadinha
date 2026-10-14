import { screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { libraryResponseSchema } from '@cruzadinha/shared'
import { apiRequest } from '../api/client'
import { queryKeys } from '../api/query-keys'
import { LoginPage } from '../features/auth/LoginPage'
import { apiError, jsonResponse, mockApi } from '../test/http'
import { aUser, makeQueryClient, renderRoutes, resetSessionHandlers } from '../test/render'
import { AppLayout } from './AppLayout'
import { requireSessionLoader } from './RequireSession'
import { clearExpired, getSessionExpired } from './session-expired'

function routesFor(queryClient: ReturnType<typeof makeQueryClient>) {
  return [
    {
      element: <AppLayout />,
      children: [
        { path: '/login', element: <LoginPage /> },
        {
          loader: requireSessionLoader(queryClient),
          children: [
            { path: '/', element: <p>Biblioteca</p> },
            { path: '/outra', element: <p>Outra tela</p> },
            { path: '/jogo/:id', element: <p>Jogo</p> },
          ],
        },
      ],
    },
  ]
}

const withSession = () => jsonResponse(200, { user: aUser })
const noSession = () => apiError(401, 'unauthenticated')

beforeEach(() => {
  clearExpired()
})

afterEach(() => {
  resetSessionHandlers()
  clearExpired()
})

describe('RequireSession', () => {
  it('sem sessão vai a /login levando o endereço de origem', async () => {
    mockApi({ 'GET /api/auth/me': noSession })
    const queryClient = makeQueryClient()
    const { router } = renderRoutes(routesFor(queryClient), ['/jogo/abc'], queryClient)
    await waitFor(() => expect(router.state.location.pathname).toBe('/login'))
    expect(router.state.location.search).toBe('?next=%2Fjogo%2Fabc')
  })

  it('depois do login volta ao endereço de origem', async () => {
    mockApi({
      'GET /api/auth/me': noSession,
      'POST /api/auth/login': withSession,
    })
    const user = userEvent.setup()
    const queryClient = makeQueryClient()
    const { router } = renderRoutes(routesFor(queryClient), ['/jogo/abc'], queryClient)
    await screen.findByRole('heading', { name: 'Entrar' })
    await user.type(screen.getByLabelText('E-mail'), aUser.email)
    await user.type(screen.getByLabelText('Senha'), 'segredo123')
    await user.click(screen.getByRole('button', { name: 'Entrar' }))
    await waitFor(() => expect(router.state.location.pathname).toBe('/jogo/abc'))
    expect(await screen.findByText('Jogo')).toBeInTheDocument()
  })

  it('com sessão mostra a tela protegida e o botão Sair', async () => {
    mockApi({ 'GET /api/auth/me': withSession })
    const queryClient = makeQueryClient()
    renderRoutes(routesFor(queryClient), ['/'], queryClient)
    expect(await screen.findByText('Biblioteca')).toBeInTheDocument()
    expect(await screen.findByRole('button', { name: 'Sair' })).toBeInTheDocument()
  })

  it('401 fora do tabuleiro limpa a sessão em cache e redireciona ao login', async () => {
    // Depois do 401 a sessão acabou de verdade: a tela de login que reconsulta `me` recebe 401 também
    // (sem isso, uma reconsulta tardia repovoaria o cache e o teste dependeria do tempo).
    let expired = false
    mockApi({
      'GET /api/auth/me': () => (expired ? noSession() : withSession()),
      'GET /api/library': () => {
        expired = true
        return noSession()
      },
    })
    const queryClient = makeQueryClient()
    const { router } = renderRoutes(routesFor(queryClient), ['/outra'], queryClient)
    await screen.findByText('Outra tela')
    await apiRequest('/api/library', libraryResponseSchema).catch(() => undefined)
    await waitFor(() => expect(router.state.location.pathname).toBe('/login'))
    expect(router.state.location.search).toBe('?next=%2Foutra')
    expect(queryClient.getQueryData(queryKeys.session)).toBeUndefined()
  })

  it('401 no tabuleiro não redireciona: marca a sessão como expirada', async () => {
    mockApi({
      'GET /api/auth/me': withSession,
      'GET /api/library': noSession,
    })
    const queryClient = makeQueryClient()
    const { router } = renderRoutes(routesFor(queryClient), ['/jogo/abc'], queryClient)
    await screen.findByText('Jogo')
    await apiRequest('/api/library', libraryResponseSchema).catch(() => undefined)
    await waitFor(() => expect(getSessionExpired().expired).toBe(true))
    expect(router.state.location.pathname).toBe('/jogo/abc')
    expect(getSessionExpired().lastUser).toEqual(aUser)
    expect(screen.getByText('Jogo')).toBeInTheDocument()
  })

  it('"Sair" encerra a sessão e volta ao login', async () => {
    let loggedIn = true
    const { calls } = mockApi({
      'GET /api/auth/me': () => (loggedIn ? withSession() : noSession()),
      'POST /api/auth/logout': () => {
        loggedIn = false
        return jsonResponse(204)
      },
    })
    const user = userEvent.setup()
    const queryClient = makeQueryClient()
    const { router } = renderRoutes(routesFor(queryClient), ['/'], queryClient)
    await user.click(await screen.findByRole('button', { name: 'Sair' }))
    await waitFor(() => expect(router.state.location.pathname).toBe('/login'))
    expect(calls.some((call) => call.key === 'POST /api/auth/logout')).toBe(true)
    await waitFor(() => expect(queryClient.getQueryData(queryKeys.session)).toBeUndefined())
    expect(screen.queryByRole('button', { name: 'Sair' })).not.toBeInTheDocument()
  })

  it('"Sair" volta ao login mesmo se a chamada falhar', async () => {
    let loggedIn = true
    mockApi({
      'GET /api/auth/me': () => (loggedIn ? withSession() : noSession()),
      'POST /api/auth/logout': () => {
        loggedIn = false
        return apiError(500, 'internal-error')
      },
    })
    const user = userEvent.setup()
    const queryClient = makeQueryClient()
    const { router } = renderRoutes(routesFor(queryClient), ['/'], queryClient)
    await user.click(await screen.findByRole('button', { name: 'Sair' }))
    await waitFor(() => expect(router.state.location.pathname).toBe('/login'))
  })
})
