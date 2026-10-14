import { screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, describe, expect, it } from 'vitest'
import { apiError, jsonResponse, mockApi } from '../../test/http'
import { aUser, renderRoutes, resetSessionHandlers } from '../../test/render'
import { RegisterPage } from './RegisterPage'

const routes = [
  { path: '/cadastro', element: <RegisterPage /> },
  { path: '/login', element: <p>Entrar</p> },
  { path: '/', element: <p>Biblioteca</p> },
]

const noSession = () => apiError(401, 'unauthenticated')

afterEach(() => {
  resetSessionHandlers()
})

async function fill(user: ReturnType<typeof userEvent.setup>, password = 'segredo123') {
  await user.type(screen.getByLabelText('Código do convite'), 'K7Q2 M9XA 4PDL 8WTE')
  await user.type(screen.getByLabelText('E-mail'), aUser.email)
  await user.type(screen.getByLabelText('Senha'), password)
}

describe('RegisterPage', () => {
  it('mostra "Convite inválido." para qualquer convite recusado', async () => {
    mockApi({
      'GET /api/auth/me': noSession,
      'POST /api/auth/register': () => apiError(400, 'invalid-invite'),
    })
    const user = userEvent.setup()
    renderRoutes(routes, ['/cadastro'])
    await fill(user)
    await user.click(screen.getByRole('button', { name: 'Criar conta' }))
    expect(await screen.findByRole('alert')).toHaveTextContent('Convite inválido.')
  })

  it('mostra "Não foi possível criar a conta." em registration-failed', async () => {
    mockApi({
      'GET /api/auth/me': noSession,
      'POST /api/auth/register': () => apiError(409, 'registration-failed'),
    })
    const user = userEvent.setup()
    renderRoutes(routes, ['/cadastro'])
    await fill(user)
    await user.click(screen.getByRole('button', { name: 'Criar conta' }))
    expect(await screen.findByRole('alert')).toHaveTextContent('Não foi possível criar a conta.')
  })

  it('bloqueia o envio com senha de menos de 8 caracteres', async () => {
    const { calls } = mockApi({ 'GET /api/auth/me': noSession })
    const user = userEvent.setup()
    renderRoutes(routes, ['/cadastro'])
    await fill(user, '1234567')
    await user.click(screen.getByRole('button', { name: 'Criar conta' }))
    await waitFor(() =>
      expect(screen.getByLabelText('Senha')).toHaveAttribute('aria-invalid', 'true'),
    )
    expect(screen.getByText('No mínimo 8 caracteres.')).toBeInTheDocument()
    expect(calls.some((call) => call.key === 'POST /api/auth/register')).toBe(false)
  })

  it('cria a conta, envia o código como digitado e vai à biblioteca', async () => {
    const { calls } = mockApi({
      'GET /api/auth/me': noSession,
      'POST /api/auth/register': () => jsonResponse(201, { user: aUser }),
    })
    const user = userEvent.setup()
    const { router } = renderRoutes(routes, ['/cadastro'])
    await fill(user)
    await user.click(screen.getByRole('button', { name: 'Criar conta' }))
    await waitFor(() => expect(router.state.location.pathname).toBe('/'))
    expect(calls.find((call) => call.key === 'POST /api/auth/register')?.body).toEqual({
      inviteCode: 'K7Q2 M9XA 4PDL 8WTE',
      email: aUser.email,
      password: 'segredo123',
    })
  })

  it('explica onde conseguir um convite e leva ao login', () => {
    mockApi({ 'GET /api/auth/me': noSession })
    renderRoutes(routes, ['/cadastro'])
    expect(screen.getByText('Peça a um amigo que já joga.')).toBeInTheDocument()
    expect(screen.getByLabelText('Senha')).toHaveAttribute('autocomplete', 'new-password')
    expect(screen.getByRole('link', { name: 'Entrar' })).toHaveAttribute('href', '/login')
  })
})
