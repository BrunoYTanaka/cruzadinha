import { expect, test, type Page } from '@playwright/test'
import {
  expectNoAxeViolations,
  expectNoHorizontalScroll,
  fakeApi,
  json,
} from './conta-por-email.support'

// Feature 049: o desafio do Turnstile no cadastro, no reenvio e na recuperação de senha. A API e o
// script da Cloudflare são simulados; nada sai para a rede.

const THEMES = ['light', 'dark'] as const
const SCRIPT = '**/challenges.cloudflare.com/turnstile/v0/api.js*'

// Entrega uma prova pouco depois de renderizar e outra depois de cada `reset`, como a Cloudflare.
const FAKE_SCRIPT = `
window.__turnstile = { renders: [], resets: 0 }
window.turnstile = {
  render(_el, options) {
    const id = 'w' + window.__turnstile.renders.push(options)
    setTimeout(() => options.callback('prova-' + id), 50)
    return id
  },
  reset(id) {
    window.__turnstile.resets += 1
    const options = window.__turnstile.renders[Number(id.slice(1)) - 1]
    setTimeout(() => options.callback('prova-' + id + '-r' + window.__turnstile.resets), 50)
  },
  remove() {},
}
`

async function fakeTurnstile(page: Page) {
  await page.route(SCRIPT, (route) =>
    route.fulfill({ status: 200, contentType: 'text/javascript', body: FAKE_SCRIPT }),
  )
}

const actions = (page: Page) =>
  page.evaluate(() =>
    (
      window as unknown as { __turnstile: { renders: { action: string; appearance: string }[] } }
    ).__turnstile.renders.map((render) => `${render.action}/${render.appearance}`),
  )

for (const theme of THEMES) {
  test.describe(`captcha, tema ${theme}`, () => {
    test.beforeEach(async ({ page }) => {
      await page.emulateMedia({ colorScheme: theme })
      await fakeTurnstile(page)
    })

    test('cadastro e reenvio só com o teclado, cada envio com uma prova diferente', async ({
      page,
    }) => {
      const api = await fakeApi(
        page,
        {
          'POST /api/auth/register': (route) => route.fulfill(json(202, { retryAfter: 1 })),
          'POST /api/auth/resend-verification': (route) =>
            route.fulfill(json(202, { retryAfter: 30 })),
        },
        { captchaRequired: true },
      )
      await page.goto('/cadastro')
      await page.getByLabel('E-mail').fill('ana@exemplo.com')
      const submit = page.getByRole('button', { name: 'Criar conta' })
      await expect(submit).toBeEnabled()
      await expectNoAxeViolations(page)
      await expectNoHorizontalScroll(page)

      await page.getByLabel('E-mail').press('Enter')
      await expect(
        page.getByRole('heading', { level: 1, name: 'Confira seu e-mail' }),
      ).toBeVisible()

      const resend = page.getByRole('button', { name: 'Reenviar link' })
      await expect(resend).not.toHaveAttribute('aria-disabled', 'true', { timeout: 5_000 })
      await resend.focus()
      await page.keyboard.press('Enter')
      await expect
        .poll(() => api.calls.filter((c) => c.path.endsWith('resend-verification')).length)
        .toBe(1)

      const tokens = api.calls
        .filter((c) => c.path.endsWith('/register') || c.path.endsWith('/resend-verification'))
        .map((c) => (c.body as { captchaToken?: string }).captchaToken)
      expect(tokens).toHaveLength(2)
      expect(tokens.every((t) => typeof t === 'string' && t.startsWith('prova-'))).toBe(true)
      expect(new Set(tokens).size).toBe(2)
      expect(await actions(page)).toEqual(['signup/interaction-only', 'resend/interaction-only'])
    })

    test('recuperação de senha com a ação forgot e prova no corpo', async ({ page }) => {
      const api = await fakeApi(
        page,
        {
          'POST /api/auth/forgot-password': (route) => route.fulfill(json(202, { retryAfter: 60 })),
        },
        { captchaRequired: true, registrationOpen: false },
      )
      await page.goto('/esqueci-a-senha')
      await page.getByLabel('E-mail').fill('ana@exemplo.com')
      await expect(page.getByRole('button', { name: 'Enviar link' })).toBeEnabled()
      await expectNoAxeViolations(page)
      await page.getByLabel('E-mail').press('Enter')
      await expect(page.getByText('tem conta, enviamos um link')).toBeVisible()

      const body = api.calls.find((c) => c.path === '/api/auth/forgot-password')?.body
      expect(body).toMatchObject({ email: 'ana@exemplo.com' })
      expect((body as { captchaToken: string }).captchaToken).toMatch(/^prova-/)
      expect(await actions(page)).toContain('forgot/interaction-only')
    })

    test('script que não carrega mostra o aviso com "Tentar de novo" e segura o envio', async ({
      page,
    }) => {
      await page.unroute(SCRIPT)
      await page.route(SCRIPT, (route) => route.abort())
      await fakeApi(page, {}, { captchaRequired: true })
      await page.goto('/cadastro')
      await expect(page.getByRole('alert')).toContainText(
        'Não foi possível carregar a verificação de segurança.',
      )
      await expect(page.getByRole('button', { name: 'Criar conta' })).toBeDisabled()
      await expectNoAxeViolations(page)

      await page.unroute(SCRIPT)
      await fakeTurnstile(page)
      await page.getByRole('button', { name: 'Tentar de novo' }).click()
      await expect(page.getByRole('button', { name: 'Tentar de novo' })).toHaveCount(0)
      await page.getByLabel('E-mail').fill('ana@exemplo.com')
      await expect(page.getByRole('button', { name: 'Criar conta' })).toBeEnabled()
    })
  })
}

test('sem captcha na API nenhum pedido vai à Cloudflare e o envio sai sem prova', async ({
  page,
}) => {
  const requested: string[] = []
  page.on('request', (request) => {
    if (request.url().includes('challenges.cloudflare.com')) requested.push(request.url())
  })
  const api = await fakeApi(
    page,
    { 'POST /api/auth/register': (route) => route.fulfill(json(202, { retryAfter: 60 })) },
    { captchaRequired: false },
  )
  await page.goto('/cadastro')
  await page.getByLabel('E-mail').fill('ana@exemplo.com')
  await page.getByRole('button', { name: 'Criar conta' }).click()
  await expect(page.getByRole('heading', { level: 1, name: 'Confira seu e-mail' })).toBeVisible()
  expect(requested).toEqual([])
  expect(api.calls.find((c) => c.path === '/api/auth/register')?.body).toEqual({
    email: 'ana@exemplo.com',
  })
})
