import AxeBuilder from '@axe-core/playwright'
import { expect, test, type Locator, type Page } from '@playwright/test'
import { box, SEED_EMAIL, resetAndSeed } from './support'

// Feature 059: a explicação da soneca entra sem mover nada, na tela de espera e no botão de enviar do
// login. Os botões da landing passaram a abrir a tela de espera (feature 063, `espera-servidor.spec.ts`).
const SOON = 'O servidor tirou uma soneca.'

test.beforeEach(async () => {
  await resetAndSeed()
})

async function boxesOf(locators: Locator[]) {
  return Promise.all(locators.map((locator) => box(locator)))
}

function expectSameBoxes(
  before: Awaited<ReturnType<typeof boxesOf>>,
  after: Awaited<ReturnType<typeof boxesOf>>,
) {
  expect(after).toHaveLength(before.length)
  before.forEach((b, i) => {
    const a = after[i]!
    for (const key of ['x', 'y', 'width', 'height'] as const) {
      expect(
        Math.abs(a[key] - b[key]),
        `elemento ${i}, ${key}: ${b[key]} -> ${a[key]}`,
      ).toBeLessThanOrEqual(1)
    }
  })
}

async function slowHealth(page: Page, ms: number) {
  await page.route('**/api/health', async (route) => {
    await new Promise((resolve) => setTimeout(resolve, ms))
    await route.continue()
  })
}

test('a tela de espera acrescenta a explicação sem mover o título nem as casas', async ({
  page,
}) => {
  await slowHealth(page, 6_000)
  await page.goto('/calendario')
  const title = page.getByRole('heading', { level: 1, name: 'Preparando as palavras…' })
  await expect(title).toBeVisible()
  const section = page.locator('section[aria-busy="true"]')
  const targets = [title, section.locator('[aria-hidden="true"]').first(), section]
  await expect(page.getByText(SOON)).toHaveCount(0)
  const before = await boxesOf(targets)
  await expect(page.getByText(SOON)).toBeVisible({ timeout: 5_000 })
  expectSameBoxes(before, await boxesOf(targets))
})

test('o botão de entrar mantém a largura e os campos não se mexem enquanto espera', async ({
  page,
}) => {
  await page.goto('/login')
  await page.route('**/api/auth/login', async (route) => {
    await new Promise((resolve) => setTimeout(resolve, 6_000))
    await route.continue()
  })
  await page.getByLabel('E-mail').fill(SEED_EMAIL)
  await page.getByLabel('Senha').fill('qualquer-senha-1')
  const submit = page.getByRole('button', { name: 'Entrar' })
  const fields = [page.getByLabel('E-mail'), page.getByLabel('Senha')]
  const before = await boxesOf([submit, ...fields])
  await submit.click()
  const pending = page.getByRole('button', { name: 'Entrando…' })
  await expect(pending).toBeDisabled()
  await expect(page.getByText(SOON)).toBeVisible({ timeout: 5_000 })
  expectSameBoxes(before, await boxesOf([pending, ...fields]))
})

for (const colorScheme of ['light', 'dark'] as const) {
  test(`espera em 320 px com menos movimento e tema ${colorScheme}: sem rolagem lateral, parada e acessível`, async ({
    page,
  }) => {
    await page.emulateMedia({ reducedMotion: 'reduce', colorScheme })
    await page.setViewportSize({ width: 320, height: 700 })
    await slowHealth(page, 6_000)
    await page.goto('/calendario')
    await expect(page.getByText(SOON)).toBeVisible({ timeout: 5_000 })
    const overflow = await page.evaluate(
      () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
    )
    expect(overflow).toBeLessThanOrEqual(0)
    const cell = page.locator('section[aria-busy="true"] [aria-hidden="true"] span').first()
    expect(await cell.evaluate((el) => getComputedStyle(el).animationName)).toBe('none')
    const { violations } = await new AxeBuilder({ page }).analyze()
    expect(violations).toEqual([])
  })
}
