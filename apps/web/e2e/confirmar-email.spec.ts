import { expect, test } from '@playwright/test'
import {
  expectNoAxeViolations,
  expectNoHorizontalScroll,
  expectSingleH1,
  fakeApi,
  json,
  TOKEN,
} from './conta-por-email.support'

// Feature 034: cadastro com "enviamos um link", reenvio com contagem regressiva, confirmação do
// e-mail com o token no fragmento e o aviso genérico quando o e-mail está indisponível.

const THEMES = ['light', 'dark'] as const
const UNAVAILABLE = 'Não foi possível enviar o e-mail agora. Tente novamente mais tarde.'

for (const theme of THEMES) {
  test.describe(`tema ${theme}`, () => {
    test.beforeEach(async ({ page }) => {
      await page.emulateMedia({ colorScheme: theme })
    })

    test('cadastro: "enviamos um link" com a contagem da API e reenvio', async ({ page }) => {
      const api = await fakeApi(page, {
        'POST /api/auth/register': (route) => route.fulfill(json(202, { retryAfter: 90 })),
        'POST /api/auth/resend-verification': (route) =>
          route.fulfill(json(202, { retryAfter: 75 })),
      })
      await page.goto('/cadastro')
      await expectSingleH1(page, 'Criar conta')
      await expectNoAxeViolations(page)

      await page.getByLabel('E-mail').fill('ana@exemplo.com')
      await page.getByRole('button', { name: 'Criar conta' }).click()

      await expectSingleH1(page, 'Confira seu e-mail')
      await expect(page.getByText('ana@exemplo.com')).toBeVisible()
      // A contagem usa o `retryAfter` da API (90 s), sem número fixo.
      await expect(
        page.getByRole('button', { name: /Reenviar link em 2 min|Reenviar link em 1 min/ }),
      ).toBeVisible()
      await expect(page.getByRole('button', { name: /Reenviar link em/ })).toHaveAttribute(
        'aria-disabled',
        'true',
      )
      await expectNoAxeViolations(page)
      expect(api.calls.some((call) => call.path === '/api/auth/resend-verification')).toBe(false)
      // Nenhuma sessão: o cabeçalho segue como visitante.
      await expect(page.locator('header')).toContainText('Visitante')
    })

    test('e-mail indisponível: aviso genérico, campos mantidos e sem tempo de espera', async ({
      page,
    }) => {
      await fakeApi(page, {
        'POST /api/auth/register': (route) =>
          route.fulfill(
            json(
              503,
              { error: 'email-unavailable', message: 'x', retryAfter: 7200 },
              {
                'retry-after': '7200',
              },
            ),
          ),
      })
      await page.goto('/cadastro')
      await page.getByLabel('E-mail').fill('ana@exemplo.com')
      await page.getByRole('button', { name: 'Criar conta' }).click()

      const alert = page.getByRole('alert')
      await expect(alert).toHaveText(UNAVAILABLE)
      await expect(alert).not.toContainText(/cota|resend|limite|7200|120|2 h/i)
      await expect(page.getByLabel('E-mail')).toHaveValue('ana@exemplo.com')
      await expectNoAxeViolations(page)
    })

    test('confirmação: o token sai do endereço, a senha é escolhida e a conta é criada sem sessão', async ({
      page,
    }) => {
      const api = await fakeApi(page, {
        'POST /api/auth/verify-email': (route) => route.fulfill(json(200, {})),
      })
      await page.goto(`/verificar-email#token=${TOKEN}`)

      await expectSingleH1(page, 'Escolha sua senha')
      await expect.poll(() => new URL(page.url()).hash).toBe('')
      // Abrir o link não gasta o token: só o envio da senha o faz.
      expect(api.calls.some((call) => call.path === '/api/auth/verify-email')).toBe(false)
      await expectNoAxeViolations(page)

      await page.getByLabel('Senha', { exact: true }).fill('senha-escolhida-1')
      await page.getByLabel('Repita a senha').fill('senha-escolhida-1')
      await page.getByRole('button', { name: 'Criar conta' }).click()

      await expectSingleH1(page, 'Conta criada')
      expect(api.calls.filter((call) => call.path === '/api/auth/verify-email')).toEqual([
        {
          method: 'POST',
          path: '/api/auth/verify-email',
          body: { token: TOKEN, password: 'senha-escolhida-1' },
        },
      ])
      await expect(page.locator('header')).toContainText('Visitante')
      await expectNoAxeViolations(page)

      await page.getByRole('link', { name: 'Entrar', exact: true }).last().click()
      await expect(page).toHaveURL(/\/login$/)
    })

    test('confirmação com link vencido oferece criar a conta de novo', async ({ page }) => {
      await fakeApi(page, {
        'POST /api/auth/verify-email': (route) =>
          route.fulfill(json(400, { error: 'invalid-token', message: 'x' })),
      })
      await page.goto(`/verificar-email#token=${TOKEN}`)
      await page.getByLabel('Senha', { exact: true }).fill('senha-escolhida-1')
      await page.getByLabel('Repita a senha').fill('senha-escolhida-1')
      await page.getByRole('button', { name: 'Criar conta' }).click()
      await expectSingleH1(page, 'Este link não vale mais')
      await expect(page.getByRole('link', { name: 'Criar conta de novo' })).toHaveAttribute(
        'href',
        '/cadastro',
      )
      await expectNoAxeViolations(page)
    })

    test('confirmação sem token no endereço não chama a API', async ({ page }) => {
      const api = await fakeApi(page, {})
      await page.goto('/verificar-email')
      await expectSingleH1(page, 'Este link não vale mais')
      expect(api.calls.some((call) => call.path === '/api/auth/verify-email')).toBe(false)
    })

    test('as telas novas não rolam na horizontal no celular de 360 px', async ({ page }) => {
      await page.setViewportSize({ width: 360, height: 740 })
      await fakeApi(page, {
        'POST /api/auth/register': (route) => route.fulfill(json(202, { retryAfter: 60 })),
        'POST /api/auth/verify-email': (route) =>
          route.fulfill(json(400, { error: 'invalid-token', message: 'x' })),
      })
      await page.goto('/cadastro')
      await expectNoHorizontalScroll(page)
      await page.getByLabel('E-mail').fill('uma-pessoa-com-um-endereco-bem-longo@exemplo.com.br')
      await page.getByRole('button', { name: 'Criar conta' }).click()
      await expectSingleH1(page, 'Confira seu e-mail')
      await expectNoHorizontalScroll(page)
      await page.goto(`/verificar-email#token=${TOKEN}`)
      await expectSingleH1(page, 'Escolha sua senha')
      await expectNoHorizontalScroll(page)
    })
  })
}
