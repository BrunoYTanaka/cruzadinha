import { expect, test } from '@playwright/test'
import { box, resetAndSeed } from './support'

// Feature 063: nas telas de dentro, Calendário fica junto da marca e Estatísticas, x1 e as
// configurações formam um grupo à direita; o Tab segue a ordem da tela.

test.beforeEach(async () => {
  await resetAndSeed()
})

test('em 1280 px, Estatísticas, x1 e a engrenagem ficam juntos à direita', async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 800 })
  await page.goto('/calendario')
  const header = page.getByRole('banner')
  const brand = await box(header.getByRole('link', { name: 'Cruzadinha' }))
  const calendar = await box(header.getByRole('link', { name: 'Calendário' }))
  const stats = await box(header.getByRole('link', { name: 'Estatísticas' }))
  const duel = await box(header.getByRole('link', { name: 'x1' }))
  const gear = await box(header.getByRole('button', { name: 'Configurações' }))

  // Calendário logo depois da marca; o grupo da direita começa depois da metade da tela.
  expect(calendar.x - (brand.x + brand.width)).toBeLessThan(40)
  expect(stats.x).toBeGreaterThan(640)
  // Vizinhos na mesma linha: Estatísticas, x1, engrenagem (Instalar pode entrar entre x1 e ela).
  for (const item of [duel, gear]) {
    expect(Math.abs(item.y + item.height / 2 - (stats.y + stats.height / 2))).toBeLessThan(2)
  }
  expect(duel.x).toBeGreaterThan(stats.x + stats.width)
  expect(duel.x - (stats.x + stats.width)).toBeLessThan(20)
  expect(gear.x).toBeGreaterThan(duel.x + duel.width)
})

test('o Tab percorre o cabeçalho na ordem da tela', async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 800 })
  await page.goto('/calendario')
  const header = page.getByRole('banner')
  await expect(header.getByRole('link', { name: 'Entrar' })).toBeVisible()
  const order = [
    header.getByRole('link', { name: 'Cruzadinha' }),
    header.getByRole('link', { name: 'Calendário' }),
    header.getByRole('link', { name: 'Estatísticas' }),
    header.getByRole('link', { name: 'x1' }),
    header.getByRole('button', { name: 'Configurações' }),
    header.getByRole('link', { name: 'Entrar' }),
  ]
  await page.keyboard.press('Tab') // "Pular para o conteúdo"
  for (const target of order) {
    await page.keyboard.press('Tab')
    await expect(target).toBeFocused()
  }
})

for (const width of [390, 320]) {
  test(`em ${width} px, marca, Menu, engrenagem e Entrar cabem numa linha`, async ({ page }) => {
    await page.setViewportSize({ width, height: 800 })
    await page.goto('/calendario')
    const header = page.getByRole('banner')
    await expect(header.getByRole('link', { name: 'Entrar' })).toBeVisible()
    await expect(header.getByRole('link', { name: 'Estatísticas' })).toBeHidden()
    const items = [
      await box(header.getByRole('link', { name: 'Cruzadinha' })),
      await box(header.getByRole('button', { name: 'Menu' })),
      await box(header.getByRole('button', { name: 'Configurações' })),
      await box(header.getByRole('link', { name: 'Entrar' })),
    ]
    const middle = (item: (typeof items)[number]) => item.y + item.height / 2
    for (const item of items) expect(Math.abs(middle(item) - middle(items[0]!))).toBeLessThan(2)
    for (let i = 1; i < items.length; i++) expect(items[i]!.x).toBeGreaterThan(items[i - 1]!.x)
    expect(
      await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth),
    ).toBe(true)
  })
}
