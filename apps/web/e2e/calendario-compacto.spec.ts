import AxeBuilder from '@axe-core/playwright'
import { expect, test, type Page } from '@playwright/test'
import { box, fillSolution, resetAndSeed, todayLink, todaySolution } from './support'

async function openToday(page: Page) {
  await page.goto('/calendario')
  await todayLink(page).click()
  await expect(page.getByRole('grid')).toBeVisible()
}

// Feature 062, fatia do calendário: abas numa linha que rola e símbolos nas células estreitas.

test.beforeEach(async () => {
  await resetAndSeed()
})

for (const theme of ['light', 'dark'] as const) {
  test(`390 px, tema ${theme}: abas numa linha que rola, botão de data fixo e sem rolagem lateral`, async ({
    page,
  }) => {
    await page.emulateMedia({ colorScheme: theme })
    await page.setViewportSize({ width: 390, height: 800 })
    await page.goto('/calendario')
    const tabs = page.getByRole('tablist', { name: 'Fonte do calendário' })
    await expect(tabs).toBeVisible()
    const overflow = await tabs.evaluate((element) => ({
      scrolls: element.scrollWidth > element.clientWidth,
      overflowX: getComputedStyle(element).overflowX,
      scrollbar: getComputedStyle(element).scrollbarWidth,
    }))
    expect(overflow).toEqual({ scrolls: true, overflowX: 'auto', scrollbar: 'none' })
    const tabBoxes = await tabs
      .getByRole('tab')
      .evaluateAll((items) => items.map((item) => item.getBoundingClientRect().top))
    expect(new Set(tabBoxes.map(Math.round)).size).toBe(1)

    const button = page.getByRole('button', { name: 'Ir para uma data' })
    const before = await box(button)
    await tabs.evaluate((element) => element.scrollTo({ left: element.scrollWidth }))
    const after = await box(button)
    expect(after.x).toBeCloseTo(before.x, 0)
    expect(after.x + after.width).toBeLessThanOrEqual(390)
    expect(
      await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth),
    ).toBe(true)
    expect((await new AxeBuilder({ page }).analyze()).violations).toEqual([])
  })

  test(`tema ${theme}: célula concluída mostra só ✓ abaixo de 480 px, e o texto por extenso acima`, async ({
    page,
  }) => {
    await page.emulateMedia({ colorScheme: theme })
    await page.setViewportSize({ width: 1280, height: 800 })
    await openToday(page)
    await fillSolution(page, await todaySolution(page.request))
    await expect(page.getByRole('dialog', { name: 'Cruzada concluída' })).toBeVisible()

    await page.goto('/calendario')
    const cell = todayLink(page)
    const status = cell.locator('[class*="statusText"]')
    // Largo: o símbolo e o tempo aparecem.
    await expect(cell).toContainText('✓')
    await expect(status).toBeVisible()
    const label = await cell.getAttribute('aria-label')
    expect(label).toMatch(/conclu/i)

    // Estreito (menos de 480 px): só o símbolo, e o nome acessível continua por extenso.
    await page.setViewportSize({ width: 390, height: 800 })
    await expect(cell).toContainText('✓')
    await expect(status).toBeHidden()
    await expect(cell).toHaveAttribute('aria-label', label ?? '')
    // A legenda leva os mesmos símbolos.
    await expect(page.getByRole('list').filter({ hasText: 'Concluído' }).first()).toContainText('✓')
  })
}
