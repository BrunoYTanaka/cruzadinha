import { screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, describe, expect, it } from 'vitest'
import { expectNoA11yViolations } from '../../test/axe'
import { apiError, jsonResponse, mockApi, type Handler } from '../../test/http'
import { renderRoutes, resetSessionHandlers } from '../../test/render'
import { VerifyEmailPage } from './VerifyEmailPage'

const TOKEN = 'a'.repeat(43)

const routes = [
  { path: '/verificar-email', element: <VerifyEmailPage /> },
  { path: '/login', element: <p>Tela de login</p> },
  { path: '/cadastro', element: <p>Tela de cadastro</p> },
]

function api(verify: Handler) {
  return mockApi({
    'GET /api/auth/me': () => apiError(401, 'unauthenticated'),
    'POST /api/auth/verify-email': verify,
  })
}

function visit(hash: string) {
  window.history.replaceState(null, '', `/verificar-email${hash}`)
}

afterEach(() => {
  resetSessionHandlers()
  window.history.replaceState(null, '', '/')
})

async function choose(
  user: ReturnType<typeof userEvent.setup>,
  password = 'senha-escolhida-1',
  confirmation = password,
) {
  await user.type(await screen.findByLabelText('Senha'), password)
  await user.type(screen.getByLabelText('Repita a senha'), confirmation)
  await user.click(screen.getByRole('button', { name: 'Criar conta' }))
}

describe('VerifyEmailPage', () => {
  it('não gasta o link ao abrir: pede a senha e só então cria a conta', async () => {
    const { calls } = api(() => jsonResponse(200, {}))
    visit(`#token=${TOKEN}`)
    const user = userEvent.setup()
    renderRoutes(routes, ['/verificar-email'])

    expect(
      await screen.findByRole('heading', { level: 1, name: 'Escolha sua senha' }),
    ).toBeVisible()
    expect(calls.some((call) => call.key === 'POST /api/auth/verify-email')).toBe(false)
    expect(window.location.hash).toBe('')

    await choose(user)
    expect(await screen.findByRole('heading', { level: 1, name: 'Conta criada' })).toBeVisible()
    expect(calls.find((call) => call.key === 'POST /api/auth/verify-email')?.body).toEqual({
      token: TOKEN,
      password: 'senha-escolhida-1',
    })
    expect(screen.getByRole('link', { name: 'Entrar' })).toHaveAttribute('href', '/login')
  })

  it('valida a senha no navegador sem gastar o link', async () => {
    const { calls } = api(() => jsonResponse(200, {}))
    visit(`#token=${TOKEN}`)
    const user = userEvent.setup()
    renderRoutes(routes, ['/verificar-email'])

    await choose(user, '1234567')
    expect(await screen.findByRole('alert')).toHaveTextContent('Confira os campos destacados.')
    await user.clear(screen.getByLabelText('Senha'))
    await user.clear(screen.getByLabelText('Repita a senha'))
    await choose(user, 'senha-escolhida-1', 'outra-coisa-2')
    expect(await screen.findByRole('alert')).toHaveTextContent('As senhas não são iguais.')
    expect(calls.some((call) => call.key === 'POST /api/auth/verify-email')).toBe(false)
  })

  it('funciona com o StrictMode', async () => {
    api(() => jsonResponse(200, {}))
    visit(`#token=${TOKEN}`)
    const user = userEvent.setup()
    renderRoutes(routes, ['/verificar-email'], undefined, { strict: true })
    await choose(user)
    expect(await screen.findByRole('heading', { name: 'Conta criada' })).toBeVisible()
  })

  it('link vencido ou usado: "Este link não vale mais" e caminho para pedir outro', async () => {
    api(() => apiError(400, 'invalid-token'))
    visit(`#token=${TOKEN}`)
    const user = userEvent.setup()
    const { container } = renderRoutes(routes, ['/verificar-email'])
    await choose(user)

    expect(
      await screen.findByRole('heading', { level: 1, name: 'Este link não vale mais' }),
    ).toBeVisible()
    expect(screen.getByRole('link', { name: 'Criar conta de novo' })).toHaveAttribute(
      'href',
      '/cadastro',
    )
    await expectNoA11yViolations(container)
  })

  it('sem token no endereço não mostra o formulário nem chama a API', async () => {
    const { calls } = api(() => jsonResponse(200, {}))
    visit('')
    renderRoutes(routes, ['/verificar-email'])

    expect(await screen.findByRole('heading', { name: 'Este link não vale mais' })).toBeVisible()
    expect(screen.queryByLabelText('Senha')).not.toBeInTheDocument()
    expect(calls.some((call) => call.key === 'POST /api/auth/verify-email')).toBe(false)
  })

  it('uma falha do servidor mantém o formulário e deixa tentar de novo', async () => {
    let attempts = 0
    api(() => {
      attempts += 1
      return attempts === 1 ? apiError(500, 'internal-error') : jsonResponse(200, {})
    })
    visit(`#token=${TOKEN}`)
    const user = userEvent.setup()
    renderRoutes(routes, ['/verificar-email'])
    await choose(user)
    expect(await screen.findByRole('alert')).toHaveTextContent('Algo deu errado. Tente de novo.')
    await user.click(screen.getByRole('button', { name: 'Criar conta' }))
    expect(await screen.findByRole('heading', { name: 'Conta criada' })).toBeVisible()
  })

  it('tem uma h1 e passa no axe no formulário e na tela de sucesso', async () => {
    api(() => jsonResponse(200, {}))
    visit(`#token=${TOKEN}`)
    const user = userEvent.setup()
    const { container } = renderRoutes(routes, ['/verificar-email'])
    await screen.findByLabelText('Senha')
    expect(screen.getAllByRole('heading', { level: 1 })).toHaveLength(1)
    await expectNoA11yViolations(container)
    await choose(user)
    await screen.findByRole('heading', { name: 'Conta criada' })
    await expectNoA11yViolations(container)
  })
})
