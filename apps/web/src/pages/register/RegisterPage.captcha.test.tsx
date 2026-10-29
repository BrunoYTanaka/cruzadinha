import { act, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { expectNoA11yViolations } from '../../test/axe'
import { apiError, jsonResponse, mockApi } from '../../test/http'
import { aUser, renderRoutes, resetSessionHandlers } from '../../test/render'
import { installFakeTurnstile } from '../../test/turnstile'
import { RegisterPage } from './RegisterPage'

vi.mock('../../shared/services/config/config', async (importOriginal) => {
  const original = await importOriginal<typeof import('../../shared/services/config/config')>()
  return { ...original, config: { ...original.config, turnstileSiteKey: 'chave-publica' } }
})

const routes = [
  { path: '/cadastro', element: <RegisterPage /> },
  { path: '/login', element: <p>Tela de login</p> },
]

let fake: ReturnType<typeof installFakeTurnstile>

beforeEach(() => {
  fake = installFakeTurnstile()
})
afterEach(() => {
  fake.uninstall()
  document.head.querySelectorAll('script').forEach((script) => script.remove())
  resetSessionHandlers()
})

function api(captchaRequired: boolean, handlers: Parameters<typeof mockApi>[0] = {}) {
  return mockApi({
    'GET /api/auth/me': () => apiError(401, 'unauthenticated'),
    'GET /api/auth/registration': () => jsonResponse(200, { open: true, captchaRequired }),
    ...handlers,
  })
}

const submitButton = () => screen.getByRole('button', { name: 'Criar conta' })

describe('cadastro com captcha (feature 049)', () => {
  it('bloqueia o envio até haver prova, a manda no corpo e pede outra depois', async () => {
    const { calls } = api(true, {
      'POST /api/auth/register': () => jsonResponse(202, { retryAfter: 60 }),
    })
    const user = userEvent.setup()
    renderRoutes(routes, ['/cadastro'])
    await user.type(await screen.findByLabelText('E-mail'), aUser.email)
    await vi.waitFor(() => expect(fake.api.render).toHaveBeenCalledTimes(1))
    expect(fake.last()?.action).toBe('signup')
    expect(submitButton()).toBeDisabled()

    fake.solve('prova-1')
    expect(submitButton()).toBeEnabled()
    await user.click(submitButton())

    expect(
      await screen.findByRole('heading', { level: 1, name: 'Confira seu e-mail' }),
    ).toBeVisible()
    expect(calls.find((call) => call.key === 'POST /api/auth/register')?.body).toEqual({
      email: aUser.email,
      captchaToken: 'prova-1',
    })
    expect(fake.api.reset).toHaveBeenCalled()
  })

  it('reseta o desafio também quando o envio falha, e segura o botão até a prova nova', async () => {
    api(true, { 'POST /api/auth/register': () => apiError(400, 'captcha-failed') })
    const user = userEvent.setup()
    renderRoutes(routes, ['/cadastro'])
    await user.type(await screen.findByLabelText('E-mail'), aUser.email)
    await vi.waitFor(() => expect(fake.api.render).toHaveBeenCalled())
    fake.solve('prova-1')
    await user.click(submitButton())

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'Não foi possível confirmar que você é uma pessoa. Recarregue a página e tente de novo.',
    )
    expect(fake.api.reset).toHaveBeenCalledTimes(1)
    expect(submitButton()).toBeDisabled()
    fake.solve('prova-2')
    expect(submitButton()).toBeEnabled()
  })

  it('desabilita o botão de novo quando a prova vence', async () => {
    api(true)
    renderRoutes(routes, ['/cadastro'])
    await screen.findByLabelText('E-mail')
    await vi.waitFor(() => expect(fake.api.render).toHaveBeenCalled())
    fake.solve('prova-1')
    expect(submitButton()).toBeEnabled()
    fake.expire()
    expect(submitButton()).toBeDisabled()
  })

  it('no reenvio usa a ação resend e uma prova nova, depois da contagem', async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true })
    try {
      const { calls } = api(true, {
        'POST /api/auth/register': () => jsonResponse(202, { retryAfter: 30 }),
        'POST /api/auth/resend-verification': () => jsonResponse(202, { retryAfter: 30 }),
      })
      const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime })
      renderRoutes(routes, ['/cadastro'])
      await user.type(await screen.findByLabelText('E-mail'), aUser.email)
      await vi.waitFor(() => expect(fake.api.render).toHaveBeenCalled())
      fake.solve('prova-1')
      await user.click(submitButton())
      await screen.findByRole('heading', { level: 1, name: 'Confira seu e-mail' })

      await vi.waitFor(() => expect(fake.last()?.action).toBe('resend'))
      fake.solve('prova-resend')
      await act(async () => {
        await vi.advanceTimersByTimeAsync(31_000)
      })
      await user.click(screen.getByRole('button', { name: 'Reenviar link' }))

      await vi.waitFor(() =>
        expect(
          calls.find((call) => call.key === 'POST /api/auth/resend-verification')?.body,
        ).toEqual({ email: aUser.email, captchaToken: 'prova-resend' }),
      )
      expect(fake.api.reset).toHaveBeenCalled()
    } finally {
      vi.useRealTimers()
    }
  })

  it('o reenvio fica bloqueado sem prova, mesmo depois da contagem', async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true })
    try {
      const { calls } = api(true, {
        'POST /api/auth/register': () => jsonResponse(202, { retryAfter: 30 }),
        'POST /api/auth/resend-verification': () => jsonResponse(202, { retryAfter: 30 }),
      })
      const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime })
      renderRoutes(routes, ['/cadastro'])
      await user.type(await screen.findByLabelText('E-mail'), aUser.email)
      await vi.waitFor(() => expect(fake.api.render).toHaveBeenCalled())
      fake.solve('prova-1')
      await user.click(submitButton())
      await screen.findByRole('heading', { level: 1, name: 'Confira seu e-mail' })
      await vi.waitFor(() => expect(fake.last()?.action).toBe('resend'))
      await act(async () => {
        await vi.advanceTimersByTimeAsync(31_000)
      })
      const resend = screen.getByRole('button', { name: 'Reenviar link' })
      expect(resend).toHaveAttribute('aria-disabled', 'true')
      await user.click(resend)
      expect(calls.some((call) => call.key === 'POST /api/auth/resend-verification')).toBe(false)
    } finally {
      vi.useRealTimers()
    }
  })

  it('mostra o aviso com "Tentar de novo" se o desafio dá erro, e o envio segue bloqueado', async () => {
    api(true)
    const user = userEvent.setup()
    renderRoutes(routes, ['/cadastro'])
    await screen.findByLabelText('E-mail')
    await vi.waitFor(() => expect(fake.api.render).toHaveBeenCalledTimes(1))
    fake.fail()

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'Não foi possível carregar a verificação de segurança.',
    )
    expect(submitButton()).toBeDisabled()
    await user.click(screen.getByRole('button', { name: 'Tentar de novo' }))
    await vi.waitFor(() => expect(fake.api.render).toHaveBeenCalledTimes(2))
    expect(screen.queryByRole('button', { name: 'Tentar de novo' })).not.toBeInTheDocument()
  })

  it('mostra o aviso se o script não carrega', async () => {
    fake.uninstall()
    api(true)
    renderRoutes(routes, ['/cadastro'])
    await screen.findByLabelText('E-mail')
    const script = await vi.waitFor(() => {
      const found = document.head.querySelector('script[src*="challenges.cloudflare.com"]')
      expect(found).not.toBeNull()
      return found
    })
    act(() => script?.dispatchEvent(new Event('error')))
    expect(await screen.findByRole('button', { name: 'Tentar de novo' })).toBeVisible()
    expect(submitButton()).toBeDisabled()
  })

  it('sem captcha na API não pede o script, não mostra o desafio e envia sem prova', async () => {
    fake.uninstall()
    const { calls } = api(false, {
      'POST /api/auth/register': () => jsonResponse(202, { retryAfter: 60 }),
    })
    const user = userEvent.setup()
    renderRoutes(routes, ['/cadastro'])
    await user.type(await screen.findByLabelText('E-mail'), aUser.email)
    expect(submitButton()).toBeEnabled()
    await user.click(submitButton())
    await screen.findByRole('heading', { level: 1, name: 'Confira seu e-mail' })
    expect(document.head.querySelector('script[src*="challenges.cloudflare.com"]')).toBeNull()
    expect(calls.find((call) => call.key === 'POST /api/auth/register')?.body).toEqual({
      email: aUser.email,
    })
  })

  it('não tem violações de acessibilidade nos dois temas', async () => {
    api(true)
    for (const theme of ['light', 'dark']) {
      document.documentElement.setAttribute('data-theme', theme)
      const { container, unmount } = renderRoutes(routes, ['/cadastro'])
      await screen.findByLabelText('E-mail')
      await vi.waitFor(() => expect(fake.api.render).toHaveBeenCalled())
      await expectNoA11yViolations(container)
      unmount()
    }
    document.documentElement.removeAttribute('data-theme')
  })
})

describe('envio duplo (feature 049)', () => {
  it('dois envios no mesmo instante mandam a prova uma vez só', async () => {
    const { calls } = api(true, {
      'POST /api/auth/register': () => jsonResponse(202, { retryAfter: 60 }),
    })
    const user = userEvent.setup()
    renderRoutes(routes, ['/cadastro'])
    const email = await screen.findByLabelText('E-mail')
    await user.type(email, aUser.email)
    await vi.waitFor(() => expect(fake.api.render).toHaveBeenCalled())
    fake.solve('prova-1')

    const form = email.closest('form') as HTMLFormElement
    act(() => {
      form.requestSubmit()
      form.requestSubmit()
    })

    await screen.findByRole('heading', { level: 1, name: 'Confira seu e-mail' })
    expect(calls.filter((call) => call.key === 'POST /api/auth/register')).toHaveLength(1)
  })
})
