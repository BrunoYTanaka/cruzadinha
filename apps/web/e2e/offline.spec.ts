import { expect, test, type Page } from '@playwright/test'
import {
  brasiliaToday,
  fillSolution,
  login,
  pressLetter,
  resetAndSeed,
  todayPuzzle,
  todaySolution,
  typedLetter,
} from './support'

test.beforeEach(async () => {
  await resetAndSeed()
})

// O service worker só passa a controlar a página na abertura seguinte (sem clientsClaim, feature 041).
async function installShell(page: Page) {
  await page.goto('/')
  await page.evaluate(() => navigator.serviceWorker.ready.then(() => undefined))
  await page.reload()
  await expect
    .poll(() => page.evaluate(() => navigator.serviceWorker.controller !== null))
    .toBe(true)
}

async function openToday(page: Page) {
  await page.goto('/')
  await page.getByRole('link', { name: /^O Globo: / }).click()
  await expect(page.getByRole('grid')).toBeVisible()
}

test('visitante: abre sem rede uma cruzada já aberta, joga até concluir e o aviso some com a rede', async ({
  page,
  context,
}) => {
  const solution = await todaySolution(page.request)
  await installShell(page)
  await openToday(page)

  await context.setOffline(true)
  await page.reload()
  await expect(page.getByRole('grid')).toBeVisible({ timeout: 10_000 })
  await expect(page.getByRole('status').filter({ hasText: 'Sem conexão' })).toBeVisible()

  await fillSolution(page, solution)
  await expect(page.getByRole('dialog', { name: 'Cruzada concluída' })).toBeVisible()

  await context.setOffline(false)
  await expect(page.getByRole('status').filter({ hasText: 'Sem conexão' })).toHaveCount(0)
})

test('uma cruzada que nunca foi aberta avisa que só abre com conexão, e o resto do site segue', async ({
  page,
  context,
}) => {
  await installShell(page)
  await context.setOffline(true)
  await page.goto('/jogo/00000000-0000-4000-8000-000000000999')
  await expect(
    page.getByRole('heading', { level: 1, name: 'Esta cruzada só abre com conexão.' }),
  ).toBeVisible()
  await page.getByRole('link', { name: 'Voltar à biblioteca' }).click()
  await expect(page.getByRole('heading', { level: 1, name: 'Hoje' })).toBeVisible()
})

test('conta: letras digitadas sem rede chegam ao servidor quando a rede volta', async ({
  page,
  context,
}) => {
  await login(page)
  const { solution } = await todayPuzzle(page.request)
  const puzzleId = (
    await (await page.request.get(`/api/puzzles?level=daily&date=${brasiliaToday()}`)).json()
  ).puzzleId as string
  await installShell(page)
  await openToday(page)

  await context.setOffline(true)
  const letter = typedLetter((solution.cells[0] ?? []).find(Boolean) ?? 'A')
  await page.getByRole('grid').click()
  await pressLetter(page, letter)
  await page.waitForTimeout(2_000)
  await context.setOffline(false)

  await expect
    .poll(
      async () => {
        const body = (await (await page.request.get(`/api/progress/${puzzleId}`)).json()) as {
          progress: { cells: (string | null)[][] } | null
        }
        return body.progress?.cells.flat().includes(letter) ?? false
      },
      { timeout: 120_000 },
    )
    .toBe(true)
})

test('baixar as cruzadas de hoje e abri-las sem rede', async ({ page, context }) => {
  await installShell(page)
  await page.getByRole('button', { name: 'Baixar as cruzadas de hoje' }).click()
  await expect(page.getByText(/^Guardadas: [1-9]/)).toBeVisible({ timeout: 30_000 })
  await expect(page.getByText('Disponível sem rede').first()).toBeVisible()

  await context.setOffline(true)
  await page.reload()
  await page.getByRole('link', { name: /^O Globo: .*disponível sem rede/ }).click()
  await expect(page.getByRole('grid')).toBeVisible({ timeout: 10_000 })
})
