import AxeBuilder from '@axe-core/playwright'
import { expect, test } from '@playwright/test'
import {
  box,
  css,
  createAccount,
  expectNear,
  login,
  makeAdmin,
  resetAndSeed,
  SEED_EMAIL,
  SEED_PASSWORD,
} from './support'

// Feature 060: administração das fontes contra a API e o banco reais.

const ADMIN_EMAIL = 'admin@cruzadinha.local'
const ADMIN_PASSWORD = 'senha-de-admin-123'

test.beforeEach(async () => {
  await resetAndSeed()
  createAccount(ADMIN_EMAIL, ADMIN_PASSWORD)
  await makeAdmin(ADMIN_EMAIL)
})

test('o admin esconde uma fonte, o público não a vê, e ao reativar ela volta', async ({
  browser,
}) => {
  const adminContext = await browser.newContext()
  const publicContext = await browser.newContext()
  const admin = await adminContext.newPage()
  const visitor = await publicContext.newPage()
  await login(admin, ADMIN_EMAIL, ADMIN_PASSWORD)

  await admin.goto('/conta')
  await admin.getByRole('link', { name: 'Administração' }).click()
  await expect(admin.getByRole('heading', { level: 1, name: 'Administração' })).toBeVisible()
  expect((await new AxeBuilder({ page: admin }).analyze()).violations).toEqual([])

  const save = admin.getByRole('button', { name: 'Salvar' })
  await admin.getByRole('checkbox', { name: /Cruzada Online/ }).uncheck()

  // Salvar não desloca o layout (FR-017): a posição do botão e da lista não muda.
  const list = admin.getByRole('list').first()
  const before = { save: await box(save), list: await box(list) }
  await save.click()
  await expect(admin.getByText(/Salvo\. 3 de 4 fontes visíveis/)).toBeVisible()
  const after = { save: await box(save), list: await box(list) }
  expectNear(after.save.y, before.save.y)
  expectNear(after.list.height, before.list.height)

  await visitor.goto('/calendario')
  await expect(visitor.getByRole('tab', { name: /^O Globo/ })).toBeVisible()
  await expect(visitor.getByRole('tab', { name: /^Cruzada Online/ })).toHaveCount(0)

  await admin.getByRole('checkbox', { name: /Cruzada Online/ }).check()
  await save.click()
  await expect(admin.getByText(/Salvo\. 4 de 4 fontes visíveis/)).toBeVisible()
  await visitor.goto('/calendario')
  await expect(visitor.getByRole('tab', { name: /^Cruzada Online/ })).toBeVisible()
})

test('o admin reordena e o calendário abre na primeira fonte visível', async ({
  browser,
  page,
}) => {
  await login(page, ADMIN_EMAIL, ADMIN_PASSWORD)
  await page.goto('/admin')
  // Sem arrastar (WCAG 2.5.7): Espaço pega a alça, setas movem, Espaço solta.
  const handle = page.getByRole('button', { name: 'Arrastar Cruzadas Clube' })
  await handle.focus()
  await page.keyboard.press('Space')
  for (let step = 0; step < 3; step++) await page.keyboard.press('ArrowUp')
  await page.keyboard.press('Space')
  await page.getByRole('button', { name: 'Salvar' }).click()
  await expect(page.getByText(/Salvo\./)).toBeVisible()

  const context = await browser.newContext()
  const visitor = await context.newPage()
  await visitor.goto('/calendario')
  const tabs = visitor.getByRole('tab')
  await expect(tabs.first()).toContainText('Cruzadas Clube')
  await expect(tabs.first()).toHaveAttribute('aria-selected', 'true')
})

test('conta comum e visitante veem a página não encontrada em /admin e não têm o link', async ({
  page,
  browser,
}) => {
  await page.goto('/admin')
  await expect(page.getByRole('heading', { level: 1, name: 'Página não encontrada' })).toBeVisible()

  const context = await browser.newContext()
  const plain = await context.newPage()
  await login(plain, SEED_EMAIL, SEED_PASSWORD)
  await plain.goto('/admin')
  await expect(
    plain.getByRole('heading', { level: 1, name: 'Página não encontrada' }),
  ).toBeVisible()
  await plain.goto('/conta')
  await expect(plain.getByRole('heading', { level: 1, name: 'Sua conta' })).toBeVisible()
  await expect(plain.getByRole('link', { name: 'Administração' })).toHaveCount(0)
})

// Feature 062: arrastar para ordenar (alça de seis pontos), com a alternativa sem arrastar.
const SOURCE_NAMES = ['O Globo', 'Cruzada Online', 'Cruzadas Brasil', 'Cruzadas Clube']

async function sourceOrder(page: import('@playwright/test').Page) {
  return page
    .getByRole('button', { name: /^Arrastar / })
    .evaluateAll((items) => items.map((item) => item.getAttribute('aria-label')?.slice(9)))
}

test('arrastar: a alça tem 44 px, não rola a página e o mouse reordena', async ({ page }) => {
  await login(page, ADMIN_EMAIL, ADMIN_PASSWORD)
  await page.goto('/admin')
  const handle = page.getByRole('button', { name: 'Arrastar Cruzadas Clube' })
  const handleBox = await box(handle)
  expect(handleBox.width).toBeGreaterThanOrEqual(44)
  expect(handleBox.height).toBeGreaterThanOrEqual(44)
  expect(await css(handle, 'touch-action')).toBe('none')
  expect(await sourceOrder(page)).toEqual(SOURCE_NAMES)

  const first = await box(page.getByRole('button', { name: 'Arrastar O Globo' }))
  await page.mouse.move(handleBox.x + handleBox.width / 2, handleBox.y + handleBox.height / 2)
  await page.mouse.down()
  await page.mouse.move(first.x + first.width / 2, first.y + 4, { steps: 12 })
  await page.mouse.up()
  await expect
    .poll(() => sourceOrder(page))
    .toEqual(['Cruzadas Clube', 'O Globo', 'Cruzada Online', 'Cruzadas Brasil'])

  await page.getByRole('button', { name: 'Salvar' }).click()
  await expect(page.getByText(/Salvo\./)).toBeVisible()
})

test('teclado: de uma ponta à outra em no máximo N+2 teclas, anuncia a posição e Esc cancela', async ({
  page,
}) => {
  await login(page, ADMIN_EMAIL, ADMIN_PASSWORD)
  await page.goto('/admin')
  const handle = page.getByRole('button', { name: 'Arrastar Cruzadas Clube' })
  // Instruções num texto fixo ligado por aria-describedby.
  const described = await handle.getAttribute('aria-describedby')
  expect(described).toBeTruthy()
  await expect(page.locator(`[id="${described}"]`)).not.toBeEmpty()

  await handle.focus()
  let keys = 0
  const press = async (key: string) => {
    keys += 1
    await page.keyboard.press(key)
  }
  await press('Space')
  await expect(page.locator('p[role="status"]')).toContainText(
    'Cruzadas Clube pega, posição 4 de 4',
  )
  for (let step = 0; step < SOURCE_NAMES.length - 1; step++) await press('ArrowUp')
  await press('Space')
  expect(keys).toBeLessThanOrEqual(SOURCE_NAMES.length + 2)
  expect(await sourceOrder(page)).toEqual([
    'Cruzadas Clube',
    'O Globo',
    'Cruzada Online',
    'Cruzadas Brasil',
  ])

  // Esc devolve a fonte ao lugar de onde saiu.
  await page.getByRole('button', { name: 'Arrastar Cruzadas Clube' }).focus()
  await page.keyboard.press('Space')
  await page.keyboard.press('ArrowDown')
  await page.keyboard.press('Escape')
  expect(await sourceOrder(page)).toEqual([
    'Cruzadas Clube',
    'O Globo',
    'Cruzada Online',
    'Cruzadas Brasil',
  ])
})
