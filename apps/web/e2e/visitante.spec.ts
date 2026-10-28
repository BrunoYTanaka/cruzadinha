import AxeBuilder from '@axe-core/playwright'
import { expect, test, type Page } from '@playwright/test'
import { fillSolution, progressRowCount, resetAndSeed, todaySolution, typedLetter } from './support'

test.beforeEach(async () => {
  await resetAndSeed()
})

// O contraste dos estados do tabuleiro é uma exceção assumida (feature 010, FR-026).
const axe = (page: Page) => new AxeBuilder({ page }).exclude('[role="grid"]')

test('visitante: calendário direto, jogar, recarregar, concluir e jogar de novo sem nada no servidor', async ({
  page,
}) => {
  const start = Date.now()
  await page.goto('/calendario')
  await expect(page.getByRole('heading', { level: 1, name: 'Hoje' })).toBeVisible()
  await expect(page.getByText('Visitante')).toBeVisible()
  await expect(page.getByRole('dialog')).toHaveCount(0)
  expect((await axe(page).analyze()).violations).toEqual([])

  await page.getByRole('link', { name: /^O Globo: / }).click()
  await expect(page.getByRole('grid')).toBeVisible()
  await expect(page.getByText('Progresso só neste aparelho')).toBeVisible()

  const solution = await todaySolution(page.request)
  const first = (solution[0] ?? []).filter((letter): letter is string => Boolean(letter))
  const firstLetter = typedLetter(first[0] ?? 'A')
  await page.keyboard.press(firstLetter)
  // SC-001: da abertura do site à primeira letra, com o servidor acordado.
  expect(Date.now() - start).toBeLessThan(30_000)
  expect((await axe(page).analyze()).violations).toEqual([])

  await page.reload()
  await expect(
    page
      .getByRole('gridcell', { name: new RegExp(`^Linha 1, coluna \\d+, letra ${firstLetter}$`) })
      .first(),
  ).toBeVisible()

  await fillSolution(page, solution)
  const dialog = page.getByRole('dialog', { name: 'Cruzada concluída' })
  await expect(dialog).toBeVisible()
  await expect(dialog.getByText(/Vamos registrar/)).toHaveCount(0)

  await dialog.getByRole('button', { name: 'Voltar à biblioteca' }).click()
  await expect(page.getByRole('link', { name: /concluído em/ }).first()).toBeVisible()

  await page.getByRole('link', { name: /^O Globo: / }).click()
  await page.getByRole('button', { name: 'Jogar de novo' }).click()
  await expect(page.getByText('0/4 Letra')).toBeVisible()

  expect(await progressRowCount()).toBe(0)
})
