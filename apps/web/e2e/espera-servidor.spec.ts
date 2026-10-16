import { expect, test, type Page } from '@playwright/test'
import { login, resetAndSeed } from './support'

// Feature 012: a tela "Acordando o servidor" enquanto a API gratuita acorda (FR-008, FR-009).
// A API "dormindo" é simulada atrasando ou recusando o /api/health no navegador.

test.beforeEach(async () => {
  await resetAndSeed()
})

const WAKE_TITLE = 'Acordando o servidor'

async function delayHealth(page: Page, ms: number) {
  await page.route('**/api/health', async (route) => {
    await new Promise((resolve) => setTimeout(resolve, ms))
    await route.continue()
  })
}

test('com a API demorando, explica a espera e depois abre a tela pedida', async ({ page }) => {
  await login(page)
  await delayHealth(page, 4_000)
  await page.goto('/?origem=teste')
  await expect(page.getByRole('heading', { name: WAKE_TITLE })).toBeVisible()
  await expect(page.getByRole('heading', { name: 'Escolha um dia' })).toBeVisible({
    timeout: 15_000,
  })
  expect(new URL(page.url()).search).toBe('?origem=teste')
})

test('com a API acordada, a espera não aparece', async ({ page }) => {
  await login(page)
  let sawWake = false
  await page.goto('/')
  const heading = page.getByRole('heading', { name: 'Escolha um dia' })
  // Confere durante a carga inteira que o título da espera nunca apareceu.
  while (!(await heading.isVisible())) {
    if (await page.getByRole('heading', { name: WAKE_TITLE }).isVisible()) sawWake = true
    await page.waitForTimeout(100)
  }
  expect(sawWake).toBe(false)
})

test('sem resposta em 90 s, mostra o erro e "Tentar de novo" volta a esperar', async ({ page }) => {
  await page.clock.install()
  await page.route('**/api/health', (route) =>
    route.fulfill({
      status: 503,
      contentType: 'application/json',
      body: JSON.stringify({ error: 'service-unavailable', message: 'x' }),
    }),
  )
  await page.goto('/login')
  // Avança o relógio da página em passos de 2 s, como as tentativas da espera.
  for (let elapsed = 0; elapsed <= 92_000; elapsed += 2_000) {
    await page.clock.fastForward(2_000)
    await page.waitForTimeout(20)
  }
  await expect(
    page.getByRole('heading', { name: 'Não foi possível falar com o servidor.' }),
  ).toBeVisible()
  await page.getByRole('button', { name: 'Tentar de novo' }).click()
  await expect(page.getByRole('heading', { name: WAKE_TITLE })).toBeVisible()
})
