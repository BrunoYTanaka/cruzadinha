import { screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, describe, expect, it } from 'vitest'
import { queryKeys } from '../../api/query-keys'
import { apiError, jsonResponse, mockApi } from '../../test/http'
import { aUser, makeQueryClient, renderRoutes, resetSessionHandlers } from '../../test/render'
import { LoginPage } from './LoginPage'

const routes = [
  { path: '/login', element: <LoginPage /> },
  { path: '/', element: <p>Biblioteca</p> },
  { path: '/jogo/:id', element: <p>Jogo</p> },
]

const noSession = () => apiError(401, 'unauthenticated')

afterEach(() => {
  resetSessionHandlers()
})

async function fillAndSubmit(user: ReturnType<typeof userEvent.setup>, password = 'segredo123') {
  await user.type(screen.getByLabelText('E-mail'), aUser.email)
  await user.type(screen.getByLabelText('Senha'), password)
  await user.click(screen.getByRole('button', { name: 'Entrar' }))
}

describe('LoginPage', () => {
  it('mostra "E-mail ou senha incorretos." sem revelar o e-mail', async () => {
    mockApi({
      'GET /api/auth/me': noSession,
      'POST /api/auth/login': () => apiError(401, 'invalid-credentials'),
    })
    const user = userEvent.setup()
    renderRoutes(routes, ['/login'])
    await fillAndSubmit(user)
    const alert = await screen.findByRole('alert')
    expect(alert).toHaveTextContent('E-mail ou senha incorretos.')
    expect(alert).not.toHaveTextContent(aUser.email)
  })

  it('mostra o tempo de espera do Retry-After em 429', async () => {
    mockApi({
      'GET /api/auth/me': noSession,
      'POST /api/auth/login': () =>
        jsonResponse(429, { error: 'too-many-attempts', message: 'x' }, { 'retry-after': '120' }),
    })
    const user = userEvent.setup()
    renderRoutes(routes, ['/login'])
    await fillAndSubmit(user)
    expect(await screen.findByRole('alert')).toHaveTextContent(
      'Muitas tentativas. Tente de novo em 2 min.',
    )
  })

  it('marca os campos que o servidor apontou em invalid-input', async () => {
    mockApi({
      'GET /api/auth/me': noSession,
      'POST /api/auth/login': () => apiError(400, 'invalid-input', { fields: ['email'] }),
    })
    const user = userEvent.setup()
    renderRoutes(routes, ['/login'])
    await fillAndSubmit(user)
    await waitFor(() =>
      expect(screen.getByLabelText('E-mail')).toHaveAttribute('aria-invalid', 'true'),
    )
    expect(screen.getByLabelText('Senha')).not.toHaveAttribute('aria-invalid')
  })

  it('pede para preencher os campos sem chamar a API', async () => {
    const { calls } = mockApi({ 'GET /api/auth/me': noSession })
    const user = userEvent.setup()
    renderRoutes(routes, ['/login'])
    await user.click(screen.getByRole('button', { name: 'Entrar' }))
    expect(await screen.findByRole('alert')).toHaveTextContent('Preencha todos os campos.')
    expect(calls.some((call) => call.key === 'POST /api/auth/login')).toBe(false)
  })

  it('volta ao endereço de origem depois de entrar', async () => {
    mockApi({
      'GET /api/auth/me': noSession,
      'POST /api/auth/login': () => jsonResponse(200, { user: aUser }),
    })
    const user = userEvent.setup()
    const { router, queryClient } = renderRoutes(routes, ['/login?next=%2Fjogo%2Fabc'])
    await fillAndSubmit(user)
    await waitFor(() => expect(router.state.location.pathname).toBe('/jogo/abc'))
    expect(queryClient.getQueryData(queryKeys.session)).toEqual({ user: aUser })
  })

  it('vai à biblioteca quando não há endereço de origem e ignora origens externas', async () => {
    mockApi({
      'GET /api/auth/me': noSession,
      'POST /api/auth/login': () => jsonResponse(200, { user: aUser }),
    })
    const user = userEvent.setup()
    const { router } = renderRoutes(routes, ['/login?next=https%3A%2F%2Fmal.example'])
    await fillAndSubmit(user)
    await waitFor(() => expect(router.state.location.pathname).toBe('/'))
  })

  it('com sessão já válida redireciona sem mostrar o formulário', async () => {
    mockApi({})
    const queryClient = makeQueryClient()
    queryClient.setQueryData(queryKeys.session, { user: aUser })
    const { router } = renderRoutes(routes, ['/login'], queryClient)
    await waitFor(() => expect(router.state.location.pathname).toBe('/'))
    expect(screen.queryByLabelText('Senha')).not.toBeInTheDocument()
  })

  it('tem rótulos visíveis e os campos certos para o gerenciador de senhas', async () => {
    mockApi({ 'GET /api/auth/me': noSession })
    renderRoutes(routes, ['/login'])
    expect(screen.getByLabelText('E-mail')).toHaveAttribute('autocomplete', 'username')
    expect(screen.getByLabelText('Senha')).toHaveAttribute('autocomplete', 'current-password')
    expect(screen.getByRole('link', { name: 'Criar conta' })).toHaveAttribute('href', '/cadastro')
  })
})
