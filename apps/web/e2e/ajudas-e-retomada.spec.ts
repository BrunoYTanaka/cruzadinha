import AxeBuilder from '@axe-core/playwright'
import { expect, test, type Page } from '@playwright/test'
import {
  helpsItem,
  login,
  resetAndSeed,
  solutionLetters,
  solveFirstAcrossWord,
  typeWord,
} from './support'

test.beforeEach(async () => {
  await resetAndSeed()
})

async function openToday(page: Page) {
  await login(page)
  await page.getByRole('link', { name: /^O Globo: / }).click()
  await expect(page.getByRole('grid')).toBeVisible()
}

// O contraste dos estados do tabuleiro é exceção documentada: só as células ficam de fora.
async function audit(page: Page) {
  const results = await new AxeBuilder({ page }).exclude('[role="grid"]').analyze()
  expect(results.violations.map((item) => `${item.id}: ${item.help}`)).toEqual([])
}

test('ajudas, recarregar mantendo tudo, rede caída e sessão expirada sem perder o tabuleiro', async ({
  page,
  context,
}) => {
  await openToday(page)

  await page.getByRole('button', { name: /Revelar letra/ }).click()
  await expect(page.getByText('1/4 Letra')).toBeVisible()
  await page.getByRole('button', { name: /Revelar palavra/ }).click()
  await expect(page.getByText('1/2 Palavra')).toBeVisible()
  // Espera o salvamento (feature 017: ele não aparece na tela) e recarrega: letras e ajudas continuam.
  const saved = page.waitForResponse(
    (response) =>
      response.request().method() === 'PUT' &&
      response.url().includes('/api/progress/') &&
      response.ok(),
    { timeout: 10_000 },
  )
  await (await helpsItem(page, 'Verificar')).click()
  await saved
  await page.reload()
  await expect(page.getByRole('grid')).toBeVisible()
  await expect(page.getByText('1/4 Letra')).toBeVisible()
  await expect(page.getByText('1/2 Palavra')).toBeVisible()
  await expect(page.getByRole('gridcell', { name: /com ajuda/ }).first()).toBeVisible()

  // Rede caída: o jogo segue.
  await context.setOffline(true)
  await page.getByRole('gridcell', { name: /vazia/ }).first().click()
  await page.keyboard.press('Z')
  await expect(page.getByRole('grid')).toBeVisible()
  await expect(page.getByText('Sem conexão, tentando de novo').first()).toBeVisible({
    timeout: 15_000,
  })
  await context.setOffline(false)

  // Sessão expirada: aviso e login por cima, sem sair do tabuleiro.
  await context.clearCookies()
  await page.getByRole('gridcell', { name: /vazia/ }).first().click()
  await page.keyboard.press('X')
  await expect(page.getByText(/Sua sessão expirou/)).toBeVisible({ timeout: 15_000 })
  await expect(page.getByRole('grid')).toBeVisible()
})

for (const theme of ['light', 'dark'] as const) {
  test(`acessibilidade nas telas principais, tema ${theme}`, async ({ page }) => {
    await page.addInitScript(
      (value) => window.localStorage.setItem('cruzadinha:theme', value),
      theme,
    )
    await page.goto('/login')
    // O tema vem do armazenamento antes da primeira pintura.
    await expect(page.locator('html')).toHaveAttribute('data-theme', theme)
    await audit(page)
    await login(page)
    await audit(page)
    await page.getByRole('link', { name: /^O Globo: / }).click()
    await expect(page.getByRole('grid')).toBeVisible()
    // Com uma dica resolvida (fundo de sucesso e visto, feature 017), para o axe medir o texto sobre
    // esse fundo no tema.
    await solveFirstAcrossWord(page)
    await expect(page.getByRole('button', { name: /, resolvida$/ })).toHaveCount(1)
    await audit(page)
    await page.getByRole('button', { name: 'Legenda do tabuleiro' }).click()
    await audit(page)
  })
}

test('visitante: só a dica da palavra certa fica riscada (feature 016)', async ({ page }) => {
  await page.goto('/')
  await page.getByRole('link', { name: /^O Globo: / }).click()
  await expect(page.getByRole('grid')).toBeVisible()
  const { puzzle, solution } = await solveFirstAcrossWord(page)
  const [first, second] = puzzle.words.filter((word) => word.direction === 'across')
  if (!first || !second) throw new Error('a cruzada de hoje deveria ter duas horizontais')
  // As horizontais não se cruzam: a segunda fica completa e toda errada.
  const wrong = solutionLetters(solution, second).map((letter) => (letter === 'A' ? 'B' : 'A'))
  await typeWord(page, second, wrong)

  await expect(page.getByRole('button', { name: /, resolvida$/ })).toHaveCount(1)
  // A lista segue a ordem de `puzzle.words`: a primeira horizontal riscada, a segunda não.
  const across = page
    .getByRole('complementary', { name: 'Dicas' })
    .getByRole('region', { name: 'Horizontais' })
    .getByRole('button')
  await expect(across.nth(0)).toHaveAccessibleName(/, resolvida$/)
  await expect(across.nth(1)).not.toHaveAccessibleName(/resolvida/)
})

test('a grade cabe em 360 px sem rolagem horizontal', async ({ page }) => {
  await page.setViewportSize({ width: 360, height: 740 })
  await openToday(page)
  const overflow = await page.evaluate(
    () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
  )
  expect(overflow).toBeLessThanOrEqual(0)
})
