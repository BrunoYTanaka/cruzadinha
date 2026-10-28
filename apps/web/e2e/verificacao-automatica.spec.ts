import { expect, test, type Page } from '@playwright/test'
import { helpsItem, login, pressLetter, resetAndSeed } from './support'

test.beforeEach(async () => {
  await resetAndSeed()
})

async function openToday(page: Page) {
  await page.goto('/calendario')
  await page.getByRole('link', { name: /^O Globo: / }).click()
  await expect(page.getByRole('grid')).toBeVisible()
}

const firstEmpty = (page: Page) =>
  page.getByRole('gridcell', { name: /^Linha 1, coluna \d+, vazia/ }).first()

test('ligar nos ajustes marca a letra errada na hora e o menu desliga', async ({ page }) => {
  await openToday(page)
  await page.getByRole('button', { name: 'Configurações' }).click()
  const dialog = page.getByRole('dialog')
  await dialog.getByRole('switch', { name: 'Verificar ao digitar' }).click()
  await dialog.getByRole('button', { name: 'Fechar' }).click()
  await expect(
    page.getByRole('button', { name: 'Ajudas, verificação automática ligada' }),
  ).toBeVisible()

  await firstEmpty(page).click()
  // "#" nunca é letra da solução; "Q" é raro, mas se acertar o teste troca de letra.
  await pressLetter(page, 'Q')
  const marked = page.getByRole('gridcell', { name: /letra Q, errada na verificação/ })
  if ((await marked.count()) === 0) {
    await page.keyboard.press('Backspace')
    await pressLetter(page, 'W')
  }
  await expect(page.getByRole('gridcell', { name: /errada na verificação/ })).toHaveCount(1)

  await page.keyboard.press('Backspace')
  await expect(page.getByRole('gridcell', { name: /errada na verificação/ })).toHaveCount(0)

  await page.reload()
  await expect(page.getByRole('grid')).toBeVisible()
  const item = await helpsItem(page, 'Verificar ao digitar')
  await expect(item).toHaveAttribute('aria-checked', 'true')
  await item.click()
  await expect(item).toHaveAttribute('aria-checked', 'false')
  await expect(page.getByRole('button', { name: 'Ajudas' })).toBeVisible()
})

test('com conta a opção volta depois de recarregar', async ({ page }) => {
  await login(page)
  await openToday(page)
  const saved = page.waitForResponse(
    (response) => response.request().method() === 'PUT' && response.url().includes('/api/settings'),
  )
  await (await helpsItem(page, 'Verificar ao digitar')).click()
  await page.keyboard.press('Escape')
  await saved
  await page.reload()
  await expect(page.getByRole('grid')).toBeVisible()
  await expect(
    page.getByRole('button', { name: 'Ajudas, verificação automática ligada' }),
  ).toBeVisible()
})
