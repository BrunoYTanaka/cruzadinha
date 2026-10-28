import { expect, test, type Page } from '@playwright/test'
import { box, resetAndSeed } from './support'

test.beforeEach(async () => {
  await resetAndSeed()
})

async function openToday(page: Page) {
  await page.goto('/')
  await page.getByRole('link', { name: /^O Globo: / }).click()
  await expect(page.getByRole('grid')).toBeVisible()
}

const dialog = (page: Page) => page.getByRole('dialog', { name: 'Atalhos de teclado' })

test('? abre a lista, Esc fecha e o tabuleiro segue intacto, sem saltos', async ({ page }) => {
  await openToday(page)
  await page.getByRole('grid').focus()
  const before = await box(page.getByRole('grid'))
  await page.keyboard.press('Shift+?')
  await expect(dialog(page)).toBeVisible()
  await expect(dialog(page).getByRole('heading', { name: 'Mover' })).toBeVisible()
  expect(await box(page.getByRole('grid'))).toEqual(before)
  await page.keyboard.press('Escape')
  await expect(dialog(page)).toBeHidden()
  expect(await box(page.getByRole('grid'))).toEqual(before)
  await expect(page.getByRole('grid')).toBeFocused()
})

test('o botão da faixa abre o diálogo e a faixa continua numa linha em 721 px', async ({
  page,
}) => {
  await page.setViewportSize({ width: 721, height: 800 })
  await openToday(page)
  const strip = page.getByRole('toolbar', { name: 'Ferramentas do jogo' })
  const height = (await box(strip)).height
  await page.getByRole('button', { name: 'Atalhos de teclado' }).click()
  await expect(dialog(page)).toBeVisible()
  await page.getByRole('button', { name: 'Fechar' }).click()
  expect((await box(strip)).height).toBe(height)
})
