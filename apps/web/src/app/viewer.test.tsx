import { screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { libraryResponseSchema } from '@cruzadinha/shared'
import { apiRequest } from '../api/client'
import { queryKeys } from '../api/query-keys'
import { useViewer } from '../features/auth/useSession'
import { apiError, jsonResponse, mockApi } from '../test/http'
import { aUser, makeQueryClient, renderRoutes, resetSessionHandlers } from '../test/render'
import { AppLayout } from './AppLayout'
import { RouteError } from './RouteError'
import { clearExpired, getSessionExpired } from './session-expired'
import { expectNoA11yViolations } from '../test/axe'
import { clearEnded } from './session-ended'
import { viewerLoader } from './viewer'

function ViewerProbe() {
  const viewer = useViewer()
  return (
    <p>{viewer ? (viewer.kind === 'guest' ? 'é visitante' : `é ${viewer.user.email}`) : '…'}</p>
  )
}

function routesFor(queryClient: ReturnType<typeof makeQueryClient>) {
  return [
    {
      element: <AppLayout />,
      children: [
        {
          loader: viewerLoader(queryClient),
          errorElement: <RouteError />,
          children: [
            { path: '/', element: <ViewerProbe /> },
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
  clearEnded()
})

afterEach(() => {
  resetSessionHandlers()
  clearExpired()
  clearEnded()
})

describe('viewerLoader e useViewer', () => {
  it('sem sessão abre a tela como visitante, sem ir ao login', async () => {
    mockApi({ 'GET /api/auth/me': noSession })
    const queryClient = makeQueryClient()
    const { router } = renderRoutes(routesFor(queryClient), ['/'], queryClient)
    expect(await screen.findByText('é visitante')).toBeInTheDocument()
    expect(router.state.location.pathname).toBe('/')
    expect(queryClient.getQueryData(queryKeys.session)).toBeNull()
  })

  it('com sessão mostra a conta e o botão Sair', async () => {
    mockApi({ 'GET /api/auth/me': withSession })
    const queryClient = makeQueryClient()
    renderRoutes(routesFor(queryClient), ['/'], queryClient)
    expect(await screen.findByText(`é ${aUser.email}`)).toBeInTheDocument()
    expect(await screen.findByRole('button', { name: 'Sair' })).toBeInTheDocument()
  })

  it('falha de rede ao consultar a sessão cai na tela de erro da rota', async () => {
    mockApi({ 'GET /api/auth/me': () => apiError(500, 'internal-error') })
    const queryClient = makeQueryClient()
    renderRoutes(routesFor(queryClient), ['/'], queryClient)
    expect(await screen.findByRole('alert')).toBeInTheDocument()
    expect(screen.queryByText('é visitante')).not.toBeInTheDocument()
  })

  it('401 no tabuleiro de uma conta não redireciona: marca a sessão como expirada', async () => {
    mockApi({ 'GET /api/auth/me': withSession, 'GET /api/library': noSession })
    const queryClient = makeQueryClient()
    const { router } = renderRoutes(routesFor(queryClient), ['/jogo/abc'], queryClient)
    await screen.findByText('Jogo')
    await apiRequest('/api/library', libraryResponseSchema).catch(() => undefined)
    await waitFor(() => expect(getSessionExpired().expired).toBe(true))
    expect(router.state.location.pathname).toBe('/jogo/abc')
    expect(getSessionExpired().lastUser).toEqual(aUser)
  })

  it('"Sair" encerra a sessão e volta à biblioteca como visitante', async () => {
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
    const { router } = renderRoutes(routesFor(queryClient), ['/jogo/abc'], queryClient)
    await user.click(await screen.findByRole('button', { name: 'Sair' }))
    await waitFor(() => expect(router.state.location.pathname).toBe('/'))
    expect(calls.some((call) => call.key === 'POST /api/auth/logout')).toBe(true)
    expect(await screen.findByText('é visitante')).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Sair' })).not.toBeInTheDocument()
  })

  it('"Sair" volta à biblioteca mesmo se a chamada falhar', async () => {
    mockApi({
      'GET /api/auth/me': withSession,
      'POST /api/auth/logout': () => apiError(500, 'internal-error'),
    })
    const user = userEvent.setup()
    const queryClient = makeQueryClient()
    const { router } = renderRoutes(routesFor(queryClient), ['/jogo/abc'], queryClient)
    await user.click(await screen.findByRole('button', { name: 'Sair' }))
    await waitFor(() => expect(router.state.location.pathname).toBe('/'))
  })

  it('a sequência Konami não faz mais nada (fim dos convites, feature 013)', async () => {
    const { calls } = mockApi({ 'GET /api/auth/me': withSession })
    const user = userEvent.setup()
    const queryClient = makeQueryClient()
    renderRoutes(routesFor(queryClient), ['/'], queryClient)
    await screen.findByText(`é ${aUser.email}`)
    const before = calls.length
    await user.keyboard(
      '{ArrowUp}{ArrowUp}{ArrowDown}{ArrowDown}{ArrowLeft}{ArrowRight}{ArrowLeft}{ArrowRight}ba',
    )
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    expect(calls.slice(before)).toEqual([])
  })

  it('401 fora do tabuleiro de uma conta: vira visitante e mostra o aviso, que não rouba o foco', async () => {
    let expired = false
    mockApi({
      'GET /api/auth/me': () => (expired ? noSession() : withSession()),
      'GET /api/library': () => {
        expired = true
        return noSession()
      },
    })
    const user = userEvent.setup()
    const queryClient = makeQueryClient()
    const { router, container } = renderRoutes(routesFor(queryClient), ['/'], queryClient)
    await screen.findByText(`é ${aUser.email}`)
    const focused = document.activeElement
    await apiRequest('/api/library', libraryResponseSchema).catch(() => undefined)

    expect(
      await screen.findByText('Sua sessão terminou. Você está como visitante.'),
    ).toBeInTheDocument()
    expect(await screen.findByText('é visitante')).toBeInTheDocument()
    expect(router.state.location.pathname).toBe('/')
    expect(document.activeElement).toBe(focused)
    await expectNoA11yViolations(container)

    const enter = screen.getByRole('button', { name: 'Entrar' })
    for (let step = 0; step < 10 && document.activeElement !== enter; step++) await user.tab()
    expect(enter).toHaveFocus()
    await user.keyboard('{Enter}')
    await waitFor(() => expect(router.state.location.pathname).toBe('/login'))
  })

  it('o aviso de sessão terminada some ao fechar', async () => {
    let expired = false
    mockApi({
      'GET /api/auth/me': () => (expired ? noSession() : withSession()),
      'GET /api/library': () => {
        expired = true
        return noSession()
      },
    })
    const user = userEvent.setup()
    const queryClient = makeQueryClient()
    renderRoutes(routesFor(queryClient), ['/'], queryClient)
    await screen.findByText(`é ${aUser.email}`)
    await apiRequest('/api/library', libraryResponseSchema).catch(() => undefined)
    await screen.findByText('Sua sessão terminou. Você está como visitante.')
    await user.click(screen.getByRole('button', { name: 'Fechar' }))
    expect(
      screen.queryByText('Sua sessão terminou. Você está como visitante.'),
    ).not.toBeInTheDocument()
  })
})
