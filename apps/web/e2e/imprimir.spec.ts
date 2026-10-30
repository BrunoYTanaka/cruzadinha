import AxeBuilder from '@axe-core/playwright'
import { expect, test, type Page } from '@playwright/test'
import { box, css, fillSolution, resetAndSeed, todayPuzzle } from './support'

// Feature 055: a folha de impressão é a única coisa visível em mídia `print`, sem letras.

test.beforeEach(async () => {
  await resetAndSeed()
})

async function openToday(page: Page) {
  await page.goto('/calendario')
  await page.getByRole('link', { name: /^O Globo: / }).click()
  await expect(page.getByRole('grid')).toBeVisible()
}

const sheet = (page: Page) => page.getByRole('region', { name: 'Folha de impressão' })

async function expectOnlySheetVisible(page: Page) {
  await expect(sheet(page)).toBeVisible()
  await expect(page.getByRole('toolbar', { name: 'Ferramentas do jogo' })).toBeHidden()
  await expect(page.getByRole('grid')).toBeHidden()
  await expect(page.getByRole('complementary', { name: 'Dicas' })).toBeHidden()
  await expect(page.getByRole('dialog')).toBeHidden()
  await expect(page.getByRole('banner')).toBeHidden()
}

test('em mídia print só a folha aparece, sem letras, mesmo com letras digitadas', async ({
  page,
}) => {
  await openToday(page)
  await expect(sheet(page)).toBeHidden()
  await page.getByRole('grid').focus()
  await page.keyboard.press('A')
  await page.keyboard.press('B')
  await page.emulateMedia({ media: 'print' })
  await expectOnlySheetVisible(page)
  const today = await todayPuzzle(page.request)
  const text = (await sheet(page).innerText()).replace(/\s+/g, ' ')
  expect(text).toContain('O Globo ·')
  expect(text).toContain('Horizontais')
  expect(text).toContain('Verticais')
  expect(text).toContain('Fonte:')
  // Células da grade só têm número, nunca letra.
  const cells = await sheet(page).locator('[class*="cell"]').allInnerTexts()
  expect(cells.length).toBeGreaterThan(0)
  expect(cells.every((value) => /^\d*$/.test(value.trim()))).toBe(true)
  expect(today.puzzle.words.length).toBeGreaterThan(0)
})

test('sem o botão: só a mídia print já mostra a folha (Ctrl+P do navegador)', async ({ page }) => {
  await openToday(page)
  await page.emulateMedia({ media: 'print' })
  await expectOnlySheetVisible(page)
})

for (const scheme of ['light', 'dark'] as const) {
  test(`fundo branco e texto preto no tema ${scheme}`, async ({ page }) => {
    await page.emulateMedia({ colorScheme: scheme })
    await openToday(page)
    await page.emulateMedia({ media: 'print', colorScheme: scheme })
    await expectOnlySheetVisible(page)
    expect(await css(sheet(page), 'background-color')).toBe('rgb(255, 255, 255)')
    expect(await css(sheet(page), 'color')).toBe('rgb(0, 0, 0)')
    expect(await css(page.locator('body'), 'background-color')).toBe('rgb(255, 255, 255)')
    const block = sheet(page).locator('svg').first()
    if (await block.count()) expect(await css(block.locator('rect'), 'fill')).toBe('rgb(0, 0, 0)')
  })
}

test('cruzada concluída: o diálogo some e a grade continua em branco', async ({ page }) => {
  await openToday(page)
  const today = await todayPuzzle(page.request)
  await fillSolution(page, today.solution.cells)
  await expect(page.getByRole('dialog', { name: 'Cruzada concluída' })).toBeVisible()
  await page.emulateMedia({ media: 'print' })
  await expectOnlySheetVisible(page)
  const cells = await sheet(page).locator('[class*="cell"]').allInnerTexts()
  expect(cells.every((value) => /^\d*$/.test(value.trim()))).toBe(true)
})

test('janela estreita (teclado na tela): mesma folha', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 800 })
  await openToday(page)
  await page.emulateMedia({ media: 'print' })
  await expect(sheet(page)).toBeVisible()
  await expect(page.getByRole('grid')).toBeHidden()
})

test('o botão chama a impressão e não mexe no jogo', async ({ page }) => {
  await page.addInitScript(() => {
    ;(window as unknown as { printed: number }).printed = 0
    window.print = () => {
      ;(window as unknown as { printed: number }).printed += 1
    }
  })
  await openToday(page)
  const grid = await box(page.getByRole('grid'))
  const timer = page.getByRole('timer')
  await page.getByRole('button', { name: 'Imprimir' }).click()
  expect(await page.evaluate(() => (window as unknown as { printed: number }).printed)).toBe(1)
  expect(await box(page.getByRole('grid'))).toEqual(grid)
  await expect(timer).toBeVisible()
})

test('a folha cabe na largura útil de A4 e carta e as casas têm 6 mm ou mais', async ({ page }) => {
  await openToday(page)
  await page.emulateMedia({ media: 'print' })
  const mm = (value: number) => (value * 25.4) / 96
  for (const width of [210, 216]) {
    // Largura da página menos 12 mm de margem de cada lado, em px de CSS.
    const usable = ((width - 24) * 96) / 25.4
    await page.setViewportSize({ width: Math.round(usable), height: 1000 })
    const grid = await box(sheet(page).locator('[class*="grid"]').first())
    expect(grid.width).toBeLessThanOrEqual(usable + 1)
    const first = await box(sheet(page).locator('[class*="cell"]').first())
    expect(mm(first.width)).toBeGreaterThanOrEqual(6)
  }
  const items = sheet(page).locator('li')
  for (const item of await items.all()) expect(await css(item, 'break-inside')).toBe('avoid')
})

test('a folha não tem violação de acessibilidade', async ({ page }) => {
  await openToday(page)
  await page.emulateMedia({ media: 'print' })
  const results = await new AxeBuilder({ page })
    .include('[aria-label="Folha de impressão"]')
    .analyze()
  expect(results.violations).toEqual([])
})
