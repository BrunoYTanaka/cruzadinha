import { screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, describe, expect, it } from 'vitest'
import { queryKeys } from '../../shared/services/api/query-keys'
import { expectNoA11yViolations } from '../../test/axe'
import { apiError, jsonResponse, mockApi, type Handler } from '../../test/http'
import { aUser, makeQueryClient, renderRoutes, resetSessionHandlers } from '../../test/render'
import { ResetPasswordPage } from './ResetPasswordPage'

const TOKEN = 'b'.repeat(43)

const routes = [
  { path: '/redefinir-senha', element: <ResetPasswordPage /> },
  { path: '/login', element: <p>Tela de login</p> },
  { path: '/esqueci-a-senha', element: <p>Esqueci</p> },
]

function api(reset: Handler) {
  return mockApi({
    'GET /api/auth/me': () => jsonResponse(200, { user: aUser }),
    'POST /api/auth/reset-password': reset,
  })
}

function visit(hash: string) {
  window.history.replaceState(null, '', `/redefinir-senha${hash}`)
}

afterEach(() => {
  resetSessionHandlers()
  window.history.replaceState(null, '', '/')
})

async function fill(
  user: ReturnType<typeof userEvent.setup>,
  password = 'senha-nova-456',
  confirmation = password,
) {
  await user.type(await screen.findByLabelText('Nova senha'), password)
  await user.type(screen.getByLabelText('Repita a nova senha'), confirmation)
  await user.click(screen.getByRole('button', { name: 'Salvar senha' }))
}

describe('ResetPasswordPage', () => {
  it('troca a senha com o token do fragmento, limpa o endereço e passa a visitante', async () => {
    const { calls } = api(() => jsonResponse(200, {}))
    visit(`#token=${TOKEN}`)
    const queryClient = makeQueryClient()
    queryClient.setQueryData(queryKeys.session, { user: aUser })
    const user = userEvent.setup()
    renderRoutes(routes, ['/redefinir-senha'], queryClient)
    await fill(user)

    expect(await screen.findByRole('heading', { level: 1, name: 'Senha alterada' })).toBeVisible()
    expect(screen.getByText('Senha alterada. Entre com a nova senha.')).toBeVisible()
    expect(calls.find((call) => call.key === 'POST /api/auth/reset-password')?.body).toEqual({
      token: TOKEN,
      password: 'senha-nova-456',
    })
    expect(window.location.hash).toBe('')
    expect(queryClient.getQueryData(queryKeys.session)).toBeNull()
    expect(screen.getByRole('link', { name: 'Entrar' })).toHaveAttribute('href', '/login')
  })

  it('valida a senha no navegador sem gastar o link', async () => {
    const { calls } = api(() => jsonResponse(200, {}))
    visit(`#token=${TOKEN}`)
    const user = userEvent.setup()
    renderRoutes(routes, ['/redefinir-senha'])

    await fill(user, '1234567')
    expect(await screen.findByRole('alert')).toHaveTextContent('Confira os campos destacados.')
    await user.clear(screen.getByLabelText('Nova senha'))
    await user.clear(screen.getByLabelText('Repita a nova senha'))
    await fill(user, 'senha-nova-456', 'outra-coisa-789')
    expect(await screen.findByRole('alert')).toHaveTextContent('As senhas não são iguais.')
    expect(calls.some((call) => call.key === 'POST /api/auth/reset-password')).toBe(false)
  })

  it('link inválido: oferece pedir outro', async () => {
    api(() => apiError(400, 'invalid-token'))
    visit(`#token=${TOKEN}`)
    const user = userEvent.setup()
    const { container } = renderRoutes(routes, ['/redefinir-senha'])
    await fill(user)

    expect(await screen.findByRole('heading', { name: 'Este link não vale mais' })).toBeVisible()
    expect(screen.getByRole('link', { name: 'Pedir novo link' })).toHaveAttribute(
      'href',
      '/esqueci-a-senha',
    )
    await expectNoA11yViolations(container)
  })

  it('sem token no endereço mostra o link inválido e não mostra o formulário', async () => {
    api(() => jsonResponse(200, {}))
    visit('')
    renderRoutes(routes, ['/redefinir-senha'])
    expect(await screen.findByRole('heading', { name: 'Este link não vale mais' })).toBeVisible()
    expect(screen.queryByLabelText('Nova senha')).not.toBeInTheDocument()
  })

  it('tem uma h1 e passa no axe no formulário', async () => {
    api(() => jsonResponse(200, {}))
    visit(`#token=${TOKEN}`)
    const { container } = renderRoutes(routes, ['/redefinir-senha'])
    await screen.findByLabelText('Nova senha')
    expect(screen.getAllByRole('heading', { level: 1 })).toHaveLength(1)
    await expectNoA11yViolations(container)
  })
})
