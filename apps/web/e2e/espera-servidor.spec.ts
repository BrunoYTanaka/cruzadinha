import AxeBuilder from '@axe-core/playwright'
import { expect, test, type Page } from '@playwright/test'
import { login, resetAndSeed } from './support'

// Feature 012: a tela de espera com a explicação da soneca enquanto a API gratuita acorda (FR-008, FR-009).
// A API "dormindo" é simulada atrasando ou recusando o /api/health no navegador.

test.beforeEach(async () => {
  await resetAndSeed()
})

const WAKE_TEXT = 'O servidor tirou uma soneca.'

async function delayHealth(page: Page, ms: number) {
  await page.route('**/api/health', async (route) => {
    await new Promise((resolve) => setTimeout(resolve, ms))
    await route.continue()
  })
}

test('com a API demorando, explica a espera e depois abre a tela pedida', async ({ page }) => {
  await login(page)
  await delayHealth(page, 4_000)
  await page.goto('/calendario?origem=teste')
  await expect(page.getByText(WAKE_TEXT)).toBeVisible()
  await expect(page.getByRole('heading', { level: 1, name: 'Escolha um dia' })).toBeAttached({
    timeout: 15_000,
  })
  expect(new URL(page.url()).search).toBe('?origem=teste')
})

test('com a API acordada, a espera não aparece', async ({ page }) => {
  await login(page)
  let sawWake = false
  await page.goto('/calendario')
  const heading = page.getByRole('heading', { level: 1, name: 'Escolha um dia' })
  // Confere durante a carga inteira que o título da espera nunca apareceu.
  while ((await heading.count()) === 0) {
    if (await page.getByText(WAKE_TEXT).isVisible()) sawWake = true
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
  await expect(page.getByText(WAKE_TEXT)).toBeVisible()
})

// Feature 063: com o servidor dormindo, os botões da landing mostram a tela de espera no lugar dela e
// seguem ao destino quando ele acorda.
for (const [name, url] of [
  ['Jogar a cruzada de hoje', /\/(dia|jogo)\//],
  ['Ver o calendário', /\/calendario$/],
  ['Entrar', /\/login$/],
] as const) {
  test(`na landing, "${name}" mostra a tela de espera e chega ao destino`, async ({ page }) => {
    await page.goto('/')
    await expect(page.getByRole('heading', { level: 1, name: /Palavras cruzadas/ })).toBeVisible()
    await delayHealth(page, 4_000)
    await page.getByRole('link', { name }).first().click()
    await expect(page.getByText(WAKE_TEXT)).toBeVisible()
    await expect(page.getByRole('heading', { level: 1 })).toHaveCount(1)
    await expect(page).toHaveURL(url, { timeout: 15_000 })
  })
}

test('a tela de espera aberta pela landing não tem violações de acessibilidade', async ({
  page,
}) => {
  await page.goto('/')
  await expect(page.getByRole('heading', { level: 1, name: /Palavras cruzadas/ })).toBeVisible()
  await delayHealth(page, 8_000)
  await page.getByRole('link', { name: 'Ver o calendário' }).click()
  await expect(page.getByText(WAKE_TEXT)).toBeVisible()
  expect((await new AxeBuilder({ page }).analyze()).violations).toEqual([])
})

test('na landing, o servidor que não acorda em 90 s mostra o erro de conexão', async ({ page }) => {
  await page.goto('/')
  await expect(page.getByRole('heading', { level: 1, name: /Palavras cruzadas/ })).toBeVisible()
  await page.clock.install()
  await page.route('**/api/health', (route) =>
    route.fulfill({
      status: 503,
      contentType: 'application/json',
      body: JSON.stringify({ error: 'service-unavailable', message: 'x' }),
    }),
  )
  await page.getByRole('link', { name: 'Ver o calendário' }).click()
  for (let elapsed = 0; elapsed <= 92_000; elapsed += 2_000) {
    await page.clock.fastForward(2_000)
    await page.waitForTimeout(20)
  }
  await expect(
    page.getByRole('heading', { name: 'Não foi possível falar com o servidor.' }),
  ).toBeVisible()
})
