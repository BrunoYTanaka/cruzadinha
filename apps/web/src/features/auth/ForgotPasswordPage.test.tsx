import { act, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { expectNoA11yViolations } from '../../test/axe'
import { apiError, jsonResponse, mockApi, type Handler } from '../../test/http'
import { aUser, renderRoutes, resetSessionHandlers } from '../../test/render'
import { ForgotPasswordPage } from './ForgotPasswordPage'

const routes = [
  { path: '/esqueci-a-senha', element: <ForgotPasswordPage /> },
  { path: '/login', element: <p>Tela de login</p> },
]

function api(forgot: Handler) {
  return mockApi({
    'GET /api/auth/me': () => apiError(401, 'unauthenticated'),
    'POST /api/auth/forgot-password': forgot,
  })
}

afterEach(() => {
  resetSessionHandlers()
})

async function submit(user: ReturnType<typeof userEvent.setup>) {
  await user.type(await screen.findByLabelText('E-mail'), aUser.email)
  await user.click(screen.getByRole('button', { name: 'Enviar link' }))
}

describe('ForgotPasswordPage', () => {
  it('pede o link e mostra o mesmo texto, com ou sem conta', async () => {
    const { calls } = api(() => jsonResponse(202, { retryAfter: 60 }))
    const user = userEvent.setup()
    renderRoutes(routes, ['/esqueci-a-senha'])
    await submit(user)

    expect(
      await screen.findByText(
        (_text, element) =>
          element?.textContent ===
          `Se ${aUser.email} tem conta, enviamos um link para redefinir a senha. Ele vale por 1 hora.`,
      ),
    ).toBeVisible()
    expect(calls.find((call) => call.key === 'POST /api/auth/forgot-password')?.body).toEqual({
      email: aUser.email,
    })
    expect(screen.getByRole('button', { name: 'Reenviar link em 1 min' })).toHaveAttribute(
      'aria-disabled',
      'true',
    )
  })

  it('o reenvio volta a pedir o link depois da contagem', async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true })
    try {
      const { calls } = api(() => jsonResponse(202, { retryAfter: 40 }))
      const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime })
      renderRoutes(routes, ['/esqueci-a-senha'])
      await submit(user)
      await screen.findByRole('button', { name: 'Reenviar link em 40 s' })
      await act(async () => {
        await vi.advanceTimersByTimeAsync(41_000)
      })
      await user.click(await screen.findByRole('button', { name: 'Reenviar link' }))
      expect(calls.filter((call) => call.key === 'POST /api/auth/forgot-password')).toHaveLength(2)
    } finally {
      vi.useRealTimers()
    }
  })

  it('email-unavailable mostra só o aviso genérico e mantém o e-mail digitado', async () => {
    api(() => apiError(503, 'email-unavailable', { retryAfter: 3600 }))
    const user = userEvent.setup()
    renderRoutes(routes, ['/esqueci-a-senha'])
    await submit(user)

    const alert = await screen.findByRole('alert')
    expect(alert).toHaveTextContent(
      'Não foi possível enviar o e-mail agora. Tente novamente mais tarde.',
    )
    expect(alert.textContent).not.toMatch(/cota|resend|limite|3600|60 min/i)
    expect(screen.getByLabelText('E-mail')).toHaveValue(aUser.email)
  })

  it('exige o e-mail antes de enviar', async () => {
    const { calls } = api(() => jsonResponse(202, { retryAfter: 60 }))
    const user = userEvent.setup()
    renderRoutes(routes, ['/esqueci-a-senha'])
    await user.click(await screen.findByRole('button', { name: 'Enviar link' }))
    expect(await screen.findByRole('alert')).toHaveTextContent('Preencha todos os campos.')
    expect(calls.some((call) => call.key === 'POST /api/auth/forgot-password')).toBe(false)
  })

  it('tem uma h1 e passa no axe nas duas telas', async () => {
    api(() => jsonResponse(202, { retryAfter: 60 }))
    const user = userEvent.setup()
    const { container } = renderRoutes(routes, ['/esqueci-a-senha'])
    expect(await screen.findAllByRole('heading', { level: 1 })).toHaveLength(1)
    await expectNoA11yViolations(container)
    await submit(user)
    await screen.findByRole('button', { name: /Reenviar link/ })
    expect(screen.getAllByRole('heading', { level: 1 })).toHaveLength(1)
    await expectNoA11yViolations(container)
  })
})
