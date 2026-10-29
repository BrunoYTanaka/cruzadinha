import { act, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { expectNoA11yViolations } from '../../test/axe'
import { apiError, jsonResponse, mockApi } from '../../test/http'
import { aUser, renderRoutes, resetSessionHandlers } from '../../test/render'
import { installFakeTurnstile } from '../../test/turnstile'
import { ForgotPasswordPage } from './ForgotPasswordPage'

vi.mock('../../shared/services/config/config', async (importOriginal) => {
  const original = await importOriginal<typeof import('../../shared/services/config/config')>()
  return { ...original, config: { ...original.config, turnstileSiteKey: 'chave-publica' } }
})

const routes = [
  { path: '/esqueci-a-senha', element: <ForgotPasswordPage /> },
  { path: '/login', element: <p>Tela de login</p> },
]

let fake: ReturnType<typeof installFakeTurnstile>

beforeEach(() => {
  fake = installFakeTurnstile()
})
afterEach(() => {
  fake.uninstall()
  resetSessionHandlers()
})

// A recuperação funciona com o cadastro fechado, e o desafio também.
function api(captchaRequired: boolean, handlers: Parameters<typeof mockApi>[0] = {}) {
  return mockApi({
    'GET /api/auth/me': () => apiError(401, 'unauthenticated'),
    'GET /api/auth/registration': () => jsonResponse(200, { open: false, captchaRequired }),
    ...handlers,
  })
}

const sendButton = () => screen.getByRole('button', { name: 'Enviar link' })

describe('recuperação de senha com captcha (feature 049)', () => {
  it('usa a ação forgot, bloqueia o envio sem prova e manda a prova no corpo', async () => {
    const { calls } = api(true, {
      'POST /api/auth/forgot-password': () => jsonResponse(202, { retryAfter: 60 }),
    })
    const user = userEvent.setup()
    renderRoutes(routes, ['/esqueci-a-senha'])
    await user.type(await screen.findByLabelText('E-mail'), aUser.email)
    await vi.waitFor(() => expect(fake.api.render).toHaveBeenCalledTimes(1))
    expect(fake.last()?.action).toBe('forgot')
    expect(sendButton()).toBeDisabled()

    fake.solve('prova-1')
    await user.click(sendButton())

    await screen.findByText(/tem conta, enviamos um link/)
    expect(calls.find((call) => call.key === 'POST /api/auth/forgot-password')?.body).toEqual({
      email: aUser.email,
      captchaToken: 'prova-1',
    })
    expect(fake.api.reset).toHaveBeenCalled()
  })

  it('o reenvio depois da contagem leva uma prova nova e fica bloqueado sem ela', async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true })
    try {
      const { calls } = api(true, {
        'POST /api/auth/forgot-password': () => jsonResponse(202, { retryAfter: 30 }),
      })
      const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime })
      renderRoutes(routes, ['/esqueci-a-senha'])
      await user.type(await screen.findByLabelText('E-mail'), aUser.email)
      await vi.waitFor(() => expect(fake.api.render).toHaveBeenCalled())
      fake.solve('prova-1')
      await user.click(sendButton())
      await screen.findByText(/tem conta, enviamos um link/)
      await act(async () => {
        await vi.advanceTimersByTimeAsync(31_000)
      })

      // Sem prova nova o reenvio não sai.
      const resend = screen.getByRole('button', { name: 'Reenviar link' })
      expect(resend).toHaveAttribute('aria-disabled', 'true')
      await user.click(resend)
      expect(calls.filter((call) => call.key === 'POST /api/auth/forgot-password')).toHaveLength(1)

      await vi.waitFor(() => expect(fake.last()?.action).toBe('forgot'))
      fake.solve('prova-2')
      await user.click(screen.getByRole('button', { name: 'Reenviar link' }))
      await vi.waitFor(() =>
        expect(
          calls.filter((call) => call.key === 'POST /api/auth/forgot-password').at(-1)?.body,
        ).toEqual({ email: aUser.email, captchaToken: 'prova-2' }),
      )
    } finally {
      vi.useRealTimers()
    }
  })

  it('mostra o aviso com "Tentar de novo" quando o desafio não funciona', async () => {
    api(true)
    renderRoutes(routes, ['/esqueci-a-senha'])
    await screen.findByLabelText('E-mail')
    await vi.waitFor(() => expect(fake.api.render).toHaveBeenCalled())
    fake.fail()
    expect(await screen.findByRole('button', { name: 'Tentar de novo' })).toBeVisible()
    expect(sendButton()).toBeDisabled()
  })

  it('sem captcha na API envia sem prova e não renderiza o desafio', async () => {
    const { calls } = api(false, {
      'POST /api/auth/forgot-password': () => jsonResponse(202, { retryAfter: 60 }),
    })
    const user = userEvent.setup()
    renderRoutes(routes, ['/esqueci-a-senha'])
    await user.type(await screen.findByLabelText('E-mail'), aUser.email)
    await user.click(sendButton())
    await screen.findByText(/tem conta, enviamos um link/)
    expect(fake.api.render).not.toHaveBeenCalled()
    expect(calls.find((call) => call.key === 'POST /api/auth/forgot-password')?.body).toEqual({
      email: aUser.email,
    })
  })

  it('não tem violações de acessibilidade nos dois temas', async () => {
    api(true)
    for (const theme of ['light', 'dark']) {
      document.documentElement.setAttribute('data-theme', theme)
      const { container, unmount } = renderRoutes(routes, ['/esqueci-a-senha'])
      await screen.findByLabelText('E-mail')
      await vi.waitFor(() => expect(fake.api.render).toHaveBeenCalled())
      await expectNoA11yViolations(container)
      unmount()
    }
    document.documentElement.removeAttribute('data-theme')
  })
})
