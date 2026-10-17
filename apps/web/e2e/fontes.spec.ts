import AxeBuilder from '@axe-core/playwright'
import { expect, test, type Page } from '@playwright/test'
import { pressLetter, progressRowCount, resetAndSeed } from './support'

test.beforeEach(async () => {
  await resetAndSeed()
})

// O contraste dos estados do tabuleiro é uma exceção assumida (feature 010, FR-026).
const axe = (page: Page) => new AxeBuilder({ page }).exclude('[role="grid"]')

const todayCell = (page: Page, state: string) =>
  page.getByRole('link', { name: new RegExp(`^Hoje, .*, ${state}$`) })

test('visitante troca para a Cruzada Online, joga o dia e o progresso não aparece no O Globo', async ({
  page,
}) => {
  await page.goto('/')
  await expect(page.getByRole('heading', { name: 'Escolha um dia' })).toBeVisible()
  const globo = page.getByRole('button', { name: 'O Globo' })
  const cruzada = page.getByRole('button', { name: 'Cruzada Online' })
  await expect(globo).toHaveAttribute('aria-pressed', 'true')

  // SC-008: a fonte e o dia de hoje, em duas interações.
  await cruzada.click()
  await expect(cruzada).toHaveAttribute('aria-pressed', 'true')
  expect((await axe(page).analyze()).violations).toEqual([])
  await page.getByRole('link', { name: /jogar a de hoje/i }).click()
  await expect(page.getByRole('grid')).toBeVisible()
  await expect(page.getByText(/Fonte: .*Cruzada Online/).first()).toBeVisible()

  // A fixture do exemplo tem Ç na linha 3, coluna 3: o jogador digita Ç e a letra conta como certa.
  await page.getByRole('gridcell', { name: /^Linha 3, coluna 3,/ }).click()
  await pressLetter(page, 'Ç')
  await expect(page.getByRole('gridcell', { name: /^Linha 3, coluna 3, letra Ç/ })).toBeVisible()
  await page.getByRole('button', { name: 'Verificar' }).click()
  await expect(page.getByText('Verificado: nenhuma letra errada')).toBeAttached()
  await expect(page.getByText('Salvo neste aparelho')).toBeVisible()

  await page.goto('/')
  await expect(cruzada).toHaveAttribute('aria-pressed', 'true')
  await expect(todayCell(page, 'em andamento')).toBeVisible()

  await globo.click()
  await expect(todayCell(page, 'não iniciado')).toBeVisible()

  await page.reload()
  await expect(page.getByRole('button', { name: 'O Globo' })).toHaveAttribute(
    'aria-pressed',
    'true',
  )
  await page.getByRole('button', { name: 'Cruzada Online' }).click()
  await expect(todayCell(page, 'em andamento')).toBeVisible()

  expect(await progressRowCount()).toBe(0)
})
