import { screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, describe, expect, it } from 'vitest'
import { expectNoA11yViolations } from '../../test/axe'
import { apiError, jsonResponse, mockApi, type Handler } from '../../test/http'
import { aUser, renderRoutes, resetSessionHandlers } from '../../test/render'
import { RegisterPage } from './RegisterPage'

const routes = [
  { path: '/cadastro', element: <RegisterPage /> },
  { path: '/login', element: <p>Tela de login</p> },
  { path: '/', element: <p>Biblioteca</p> },
]

const noSession = () => apiError(401, 'unauthenticated')
const open = () => jsonResponse(200, { open: true })
const closed = () => jsonResponse(200, { open: false })

function api(handlers: Record<string, Handler> = {}, registration: Handler = open) {
  return mockApi({
    'GET /api/auth/me': noSession,
    'GET /api/auth/registration': registration,
    ...handlers,
  })
}

afterEach(() => {
  resetSessionHandlers()
})

async function fill(user: ReturnType<typeof userEvent.setup>, password = 'segredo123') {
  await user.type(await screen.findByLabelText('E-mail'), aUser.email)
  await user.type(screen.getByLabelText('Senha'), password)
}

describe('RegisterPage com o cadastro aberto (feature 013)', () => {
  it('pede só e-mail e senha, sem campo de convite', async () => {
    api()
    renderRoutes(routes, ['/cadastro'])
    expect(await screen.findByLabelText('E-mail')).toBeInTheDocument()
    expect(screen.getByLabelText('Senha')).toHaveAttribute('autocomplete', 'new-password')
    expect(screen.queryByLabelText(/convite/i)).not.toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Entrar' })).toHaveAttribute('href', '/login')
  })

  it('cria a conta só com e-mail e senha e chega à biblioteca logado', async () => {
    const { calls } = api({ 'POST /api/auth/register': () => jsonResponse(201, { user: aUser }) })
    const user = userEvent.setup()
    const { router } = renderRoutes(routes, ['/cadastro'])
    await fill(user)
    await user.click(screen.getByRole('button', { name: 'Criar conta' }))
    await waitFor(() => expect(router.state.location.pathname).toBe('/'))
    expect(calls.find((call) => call.key === 'POST /api/auth/register')?.body).toEqual({
      email: aUser.email,
      password: 'segredo123',
    })
  })

  it('mostra "Não foi possível criar a conta." em registration-failed', async () => {
    api({ 'POST /api/auth/register': () => apiError(409, 'registration-failed') })
    const user = userEvent.setup()
    renderRoutes(routes, ['/cadastro'])
    await fill(user)
    await user.click(screen.getByRole('button', { name: 'Criar conta' }))
    expect(await screen.findByRole('alert')).toHaveTextContent('Não foi possível criar a conta.')
  })

  it('bloqueia o envio com senha de menos de 8 caracteres', async () => {
    const { calls } = api()
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

  it('um envio recusado por cadastro fechado (aba antiga) mostra o aviso de fechado', async () => {
    api({ 'POST /api/auth/register': () => apiError(403, 'registration-closed') })
    const user = userEvent.setup()
    renderRoutes(routes, ['/cadastro'])
    await fill(user)
    await user.click(screen.getByRole('button', { name: 'Criar conta' }))
    expect(await screen.findByText('O cadastro está fechado no momento.')).toBeInTheDocument()
    expect(screen.queryByLabelText('E-mail')).not.toBeInTheDocument()
  })

  it('passa nas regras de acessibilidade', async () => {
    api()
    const { container } = renderRoutes(routes, ['/cadastro'])
    await screen.findByLabelText('E-mail')
    await expectNoA11yViolations(container)
  })
})

describe('RegisterPage com o cadastro fechado', () => {
  it.each([
    ['fechado', closed],
    ['sem resposta (API anterior)', () => apiError(404, 'puzzle-unavailable')],
  ])('%s: mostra o aviso e o link Entrar, sem formulário', async (_case, registration) => {
    api({}, registration)
    const { container } = renderRoutes(routes, ['/cadastro'])
    expect(await screen.findByText('O cadastro está fechado no momento.')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Entrar' })).toHaveAttribute('href', '/login')
    expect(screen.getByRole('link', { name: 'Jogar sem entrar' })).toHaveAttribute('href', '/')
    expect(screen.queryByLabelText('E-mail')).not.toBeInTheDocument()
    await expectNoA11yViolations(container)
  })
})
