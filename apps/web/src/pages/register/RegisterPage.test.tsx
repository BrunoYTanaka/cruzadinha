import { act, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, describe, expect, it, vi } from 'vitest'
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

async function fill(user: ReturnType<typeof userEvent.setup>) {
  await user.type(await screen.findByLabelText('E-mail'), aUser.email)
}

describe('RegisterPage com o cadastro aberto (feature 013)', () => {
  it('pede só o e-mail: a senha é escolhida na confirmação, e não há campo de convite', async () => {
    api()
    renderRoutes(routes, ['/cadastro'])
    expect(await screen.findByLabelText('E-mail')).toBeInTheDocument()
    expect(screen.queryByLabelText('Senha')).not.toBeInTheDocument()
    expect(screen.queryByLabelText(/convite/i)).not.toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Entrar' })).toHaveAttribute('href', '/login')
  })

  it('pede só o link: mostra "enviamos um link", sem abrir sessão nem ir à biblioteca', async () => {
    const { calls } = api({
      'POST /api/auth/register': () => jsonResponse(202, { retryAfter: 60 }),
    })
    const user = userEvent.setup()
    const { router } = renderRoutes(routes, ['/cadastro'])
    await fill(user)
    await user.click(screen.getByRole('button', { name: 'Criar conta' }))

    expect(
      await screen.findByRole('heading', { level: 1, name: 'Confira seu e-mail' }),
    ).toBeVisible()
    expect(screen.getByText(aUser.email)).toBeInTheDocument()
    expect(router.state.location.pathname).toBe('/cadastro')
    expect(calls.find((call) => call.key === 'POST /api/auth/register')?.body).toEqual({
      email: aUser.email,
    })
  })

  it('mostra o reenvio com a contagem do retryAfter da API e o reinicia a cada resposta', async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true })
    try {
      let retryAfter = 45
      const { calls } = api({
        'POST /api/auth/register': () => jsonResponse(202, { retryAfter }),
        'POST /api/auth/resend-verification': () => jsonResponse(202, { retryAfter: 30 }),
      })
      const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime })
      renderRoutes(routes, ['/cadastro'])
      await fill(user)
      await user.click(screen.getByRole('button', { name: 'Criar conta' }))

      const resend = await screen.findByRole('button', { name: 'Reenviar link em 45 s' })
      expect(resend).toHaveAttribute('aria-disabled', 'true')
      await user.click(resend)
      expect(calls.some((call) => call.key === 'POST /api/auth/resend-verification')).toBe(false)

      await act(async () => {
        await vi.advanceTimersByTimeAsync(46_000)
      })
      retryAfter = 30
      await user.click(await screen.findByRole('button', { name: 'Reenviar link' }))
      expect(await screen.findByRole('button', { name: 'Reenviar link em 30 s' })).toBeVisible()
      expect(calls.find((call) => call.key === 'POST /api/auth/resend-verification')?.body).toEqual(
        { email: aUser.email },
      )
    } finally {
      vi.useRealTimers()
    }
  })

  it('email-unavailable mostra só o aviso genérico, mantém o que foi digitado e não cita tempo', async () => {
    api({
      'POST /api/auth/register': () => apiError(503, 'email-unavailable', { retryAfter: 7200 }),
    })
    const user = userEvent.setup()
    renderRoutes(routes, ['/cadastro'])
    await fill(user)
    await user.click(screen.getByRole('button', { name: 'Criar conta' }))

    const alert = await screen.findByRole('alert')
    expect(alert).toHaveTextContent(
      'Não foi possível enviar o e-mail agora. Tente novamente mais tarde.',
    )
    expect(alert.textContent).not.toMatch(/cota|resend|limite|7200|120 min/i)
    expect(screen.getByLabelText('E-mail')).toHaveValue(aUser.email)
  })

  it('email-unavailable no reenvio mantém a tela "enviamos um link"', async () => {
    api({
      'POST /api/auth/register': () => jsonResponse(202, { retryAfter: 30 }),
      'POST /api/auth/resend-verification': () =>
        jsonResponse(
          503,
          { error: 'email-unavailable', message: 'x', retryAfter: 7200 },
          { 'retry-after': '7200' },
        ),
    })
    vi.useFakeTimers({ shouldAdvanceTime: true })
    try {
      const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime })
      renderRoutes(routes, ['/cadastro'])
      await fill(user)
      await user.click(screen.getByRole('button', { name: 'Criar conta' }))
      await screen.findByRole('heading', { name: 'Confira seu e-mail' })
      await act(async () => {
        await vi.advanceTimersByTimeAsync(31_000)
      })
      await user.click(await screen.findByRole('button', { name: 'Reenviar link' }))
      expect(await screen.findByRole('alert')).toHaveTextContent(
        'Não foi possível enviar o e-mail agora. Tente novamente mais tarde.',
      )
      expect(screen.getByRole('heading', { name: 'Confira seu e-mail' })).toBeVisible()
      // O botão fica parado, mas sem dizer por quanto tempo.
      const held = screen.getByRole('button', { name: 'Reenviar link' })
      expect(held).toHaveAttribute('aria-disabled', 'true')
    } finally {
      vi.useRealTimers()
    }
  })

  it('429 mostra a espera do servidor e usa o retryAfter na contagem do reenvio', async () => {
    api({
      'POST /api/auth/register': () => jsonResponse(202, { retryAfter: 30 }),
      'POST /api/auth/resend-verification': () =>
        new Response(
          JSON.stringify({ error: 'too-many-attempts', message: 'x', retryAfter: 120 }),
          {
            status: 429,
            headers: { 'content-type': 'application/json', 'retry-after': '120' },
          },
        ),
    })
    vi.useFakeTimers({ shouldAdvanceTime: true })
    try {
      const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime })
      renderRoutes(routes, ['/cadastro'])
      await fill(user)
      await user.click(screen.getByRole('button', { name: 'Criar conta' }))
      await screen.findByRole('heading', { name: 'Confira seu e-mail' })
      await act(async () => {
        await vi.advanceTimersByTimeAsync(31_000)
      })
      await user.click(await screen.findByRole('button', { name: 'Reenviar link' }))
      expect(await screen.findByRole('alert')).toHaveTextContent('Tente de novo em 2 min')
      expect(await screen.findByRole('button', { name: 'Reenviar link em 2 min' })).toBeVisible()
    } finally {
      vi.useRealTimers()
    }
  })

  it('exige o e-mail antes de enviar', async () => {
    const { calls } = api()
    const user = userEvent.setup()
    renderRoutes(routes, ['/cadastro'])
    await user.click(await screen.findByRole('button', { name: 'Criar conta' }))
    expect(await screen.findByRole('alert')).toHaveTextContent('Preencha todos os campos.')
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
