import { expect, test } from '@playwright/test'
import {
  expectNoAxeViolations,
  expectNoHorizontalScroll,
  expectSingleH1,
  fakeApi,
  json,
  NEW_PASSWORD,
  TOKEN,
} from './conta-por-email.support'

// Feature 034: "esqueci a senha" e redefinição com o token no fragmento. A API é simulada.

const THEMES = ['light', 'dark'] as const
const UNAVAILABLE = 'Não foi possível enviar o e-mail agora. Tente novamente mais tarde.'

for (const theme of THEMES) {
  test.describe(`tema ${theme}`, () => {
    test.beforeEach(async ({ page }) => {
      await page.emulateMedia({ colorScheme: theme })
    })

    test('login oferece "Esqueci a senha" e o pedido mostra o mesmo texto com ou sem conta', async ({
      page,
    }) => {
      const api = await fakeApi(page, {
        'POST /api/auth/forgot-password': (route) => route.fulfill(json(202, { retryAfter: 60 })),
      })
      await page.goto('/login')
      await page.getByRole('link', { name: 'Esqueci a senha' }).click()
      await expect(page).toHaveURL(/\/esqueci-a-senha$/)
      await expectSingleH1(page, 'Esqueci a senha')
      await expectNoAxeViolations(page)

      await page.getByLabel('E-mail').fill('ninguem@exemplo.com')
      await page.getByRole('button', { name: 'Enviar link' }).click()
      await expect(
        page.getByText('tem conta, enviamos um link para redefinir a senha'),
      ).toBeVisible()
      await expect(page.getByRole('button', { name: /Reenviar link em/ })).toHaveAttribute(
        'aria-disabled',
        'true',
      )
      await expectSingleH1(page, 'Esqueci a senha')
      await expectNoAxeViolations(page)
      expect(api.calls.find((call) => call.path === '/api/auth/forgot-password')?.body).toEqual({
        email: 'ninguem@exemplo.com',
      })
    })

    test('e-mail indisponível na recuperação: aviso genérico e e-mail mantido', async ({
      page,
    }) => {
      await fakeApi(page, {
        'POST /api/auth/forgot-password': (route) =>
          route.fulfill(json(503, { error: 'email-unavailable', message: 'x', retryAfter: 3600 })),
      })
      await page.goto('/esqueci-a-senha')
      await page.getByLabel('E-mail').fill('ana@exemplo.com')
      await page.getByRole('button', { name: 'Enviar link' }).click()
      const alert = page.getByRole('alert')
      await expect(alert).toHaveText(UNAVAILABLE)
      await expect(alert).not.toContainText(/cota|resend|limite|3600|60 min/i)
      await expect(page.getByLabel('E-mail')).toHaveValue('ana@exemplo.com')
      await expectNoAxeViolations(page)
    })

    test('redefinir: o token sai do endereço, a senha muda e a pessoa vira visitante', async ({
      page,
    }) => {
      const api = await fakeApi(page, {
        'POST /api/auth/reset-password': (route) => route.fulfill(json(200, {})),
      })
      await page.goto(`/redefinir-senha#token=${TOKEN}`)
      await expectSingleH1(page, 'Nova senha')
      await expect.poll(() => new URL(page.url()).hash).toBe('')
      await expectNoAxeViolations(page)

      await page.getByLabel('Nova senha', { exact: true }).fill(NEW_PASSWORD)
      await page.getByLabel('Repita a nova senha').fill(NEW_PASSWORD)
      await page.getByRole('button', { name: 'Salvar senha' }).click()

      await expectSingleH1(page, 'Senha alterada')
      await expect(page.getByText('Senha alterada. Entre com a nova senha.')).toBeVisible()
      expect(api.calls.find((call) => call.path === '/api/auth/reset-password')?.body).toEqual({
        token: TOKEN,
        password: NEW_PASSWORD,
      })
      await expect(page.locator('header')).toContainText('Visitante')
      await expectNoAxeViolations(page)
    })

    test('redefinir com link inválido oferece pedir outro', async ({ page }) => {
      await fakeApi(page, {
        'POST /api/auth/reset-password': (route) =>
          route.fulfill(json(400, { error: 'invalid-token', message: 'x' })),
      })
      await page.goto(`/redefinir-senha#token=${TOKEN}`)
      await page.getByLabel('Nova senha', { exact: true }).fill(NEW_PASSWORD)
      await page.getByLabel('Repita a nova senha').fill(NEW_PASSWORD)
      await page.getByRole('button', { name: 'Salvar senha' }).click()
      await expectSingleH1(page, 'Este link não vale mais')
      await expect(page.getByRole('link', { name: 'Pedir novo link' })).toHaveAttribute(
        'href',
        '/esqueci-a-senha',
      )
      await expectNoAxeViolations(page)
    })

    test('redefinir sem token no endereço mostra o link inválido', async ({ page }) => {
      await fakeApi(page, {})
      await page.goto('/redefinir-senha')
      await expectSingleH1(page, 'Este link não vale mais')
      await expect(page.getByLabel('Nova senha', { exact: true })).toHaveCount(0)
    })

    test('as telas não rolam na horizontal no celular de 360 px', async ({ page }) => {
      await page.setViewportSize({ width: 360, height: 740 })
      await fakeApi(page, {
        'POST /api/auth/forgot-password': (route) => route.fulfill(json(202, { retryAfter: 60 })),
      })
      await page.goto('/esqueci-a-senha')
      await expectNoHorizontalScroll(page)
      await page.getByLabel('E-mail').fill('uma-pessoa-com-um-endereco-bem-longo@exemplo.com.br')
      await page.getByRole('button', { name: 'Enviar link' }).click()
      await expect(page.getByRole('button', { name: /Reenviar link em/ })).toBeVisible()
      await expectNoHorizontalScroll(page)
      await page.goto(`/redefinir-senha#token=${TOKEN}`)
      await expectSingleH1(page, 'Nova senha')
      await expectNoHorizontalScroll(page)
    })
  })
}
