import AxeBuilder from '@axe-core/playwright'
import { expect, test, type Page } from '@playwright/test'
import { box, pressLetter, resetAndSeed } from './support'

test.beforeEach(async () => {
  await resetAndSeed()
})

async function openToday(page: Page) {
  await page.goto('/')
  await page.getByRole('link', { name: /^O Globo: / }).click()
  await expect(page.getByRole('grid')).toBeVisible()
}

const pencil = (page: Page) => page.getByRole('button', { name: 'Lápis (rascunho)' })

test('anotar, recarregar, confirmar', async ({ page }) => {
  await openToday(page)
  await pencil(page).click()
  await expect(pencil(page)).toHaveAttribute('aria-pressed', 'true')
  await page
    .getByRole('gridcell', { name: /^Linha 1, coluna \d+, vazia/ })
    .first()
    .click()
  await pressLetter(page, 'A')
  await expect(page.getByRole('gridcell', { name: /, rascunho A$/ })).toHaveCount(1)

  await page.reload()
  await expect(page.getByRole('grid')).toBeVisible()
  await expect(pencil(page)).toHaveAttribute('aria-pressed', 'true')
  await expect(page.getByRole('gridcell', { name: /, rascunho A$/ })).toHaveCount(1)

  await page.getByRole('button', { name: 'Confirmar rascunho' }).click()
  await expect(page.getByRole('gridcell', { name: /, letra A$/ })).toHaveCount(1)
  await expect(page.getByRole('gridcell', { name: /, rascunho / })).toHaveCount(0)
})

test('ligar o lápis e digitar com ele não move nada', async ({ page }) => {
  await openToday(page)
  const toolbar = page.getByRole('toolbar', { name: 'Ferramentas do jogo' })
  const measure = async () => [await box(toolbar), await box(page.getByRole('grid'))]
  const before = await measure()
  await pencil(page).click()
  await page
    .getByRole('gridcell', { name: /^Linha 1, coluna \d+, vazia/ })
    .first()
    .click()
  for (let count = 0; count < 5; count += 1) await pressLetter(page, 'A')
  expect(await measure()).toEqual(before)
})

test.describe('janela estreita com o teclado na tela', () => {
  test.use({ viewport: { width: 390, height: 800 }, hasTouch: true })

  test('chega ao lápis e digita um rascunho', async ({ page }) => {
    await openToday(page)
    await pencil(page).click()
    await page
      .getByRole('gridcell', { name: /^Linha 1, coluna \d+, vazia/ })
      .first()
      .click()
    await page
      .getByRole('group', { name: 'Teclado' })
      .getByRole('button', { name: 'A', exact: true })
      .click()
    await expect(page.getByRole('gridcell', { name: /, rascunho A$/ })).toHaveCount(1)
  })
})

for (const theme of ['light', 'dark'] as const) {
  test(`acessibilidade com rascunho no tabuleiro, tema ${theme}`, async ({ page }) => {
    await page.addInitScript(
      (value) => window.localStorage.setItem('cruzadinha:theme', value),
      theme,
    )
    await openToday(page)
    await expect(page.locator('html')).toHaveAttribute('data-theme', theme)
    await pencil(page).click()
    await page
      .getByRole('gridcell', { name: /^Linha 1, coluna \d+, vazia/ })
      .first()
      .click()
    await pressLetter(page, 'A')
    const results = await new AxeBuilder({ page }).analyze()
    expect(results.violations.map((item) => `${item.id}: ${item.help}`)).toEqual([])
  })
}
