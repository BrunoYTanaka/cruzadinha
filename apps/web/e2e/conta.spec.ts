import AxeBuilder from '@axe-core/playwright'
import { expect, test } from '@playwright/test'
import { box, expectNear, login, resetAndSeed, SEED_EMAIL, SEED_PASSWORD } from './support'

// Feature 042: gestão da conta contra a API e o banco reais.

const NEW_PASSWORD = 'senha-nova-456'

test.beforeEach(async () => {
  await resetAndSeed()
})

test('trocar a senha encerra o outro aparelho e excluir a conta apaga o acesso', async ({
  browser,
}) => {
  const first = await browser.newContext()
  const second = await browser.newContext()
  const page = await first.newPage()
  const other = await second.newPage()
  await login(page)
  await login(other)

  await page.goto('/conta')
  await page.getByLabel('Senha atual').first().fill(SEED_PASSWORD)
  await page.getByLabel('Nova senha').fill(NEW_PASSWORD)
  await page.getByRole('button', { name: 'Trocar senha' }).click()
  await expect(page.getByText(/Senha trocada/)).toBeVisible()

  // O outro aparelho perdeu a sessão: recarregar o leva a visitante.
  await other.reload()
  await expect(other.getByRole('link', { name: 'Entrar' }).first()).toBeVisible()

  await page.getByRole('button', { name: 'Excluir conta' }).click()
  await page.getByRole('dialog').getByLabel('Senha atual').fill(NEW_PASSWORD)
  await page.getByRole('button', { name: 'Excluir para sempre' }).click()
  await expect(page).not.toHaveURL(/\/conta/)

  await other.goto('/login')
  await other.getByLabel('E-mail').fill(SEED_EMAIL)
  await other.getByLabel('Senha').fill(NEW_PASSWORD)
  await other.getByRole('button', { name: 'Entrar' }).click()
  await expect(other.getByRole('heading', { level: 1, name: 'Hoje' })).toHaveCount(0)

  await first.close()
  await second.close()
})

test('/conta não muda de lugar ao digitar e passa no axe', async ({ page }) => {
  await login(page)
  await page.goto('/conta')
  const button = page.getByRole('button', { name: 'Trocar senha' })
  const before = await box(button)
  await page.getByLabel('Senha atual').first().fill(SEED_PASSWORD)
  await page.getByLabel('Nova senha').fill(NEW_PASSWORD)
  const after = await box(button)
  expectNear(after.x, before.x)
  expectNear(after.y, before.y)
  const results = await new AxeBuilder({ page }).analyze()
  expect(results.violations.map((item) => `${item.id}: ${item.help}`)).toEqual([])
})
