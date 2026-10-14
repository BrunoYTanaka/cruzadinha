import { expect, test } from '@playwright/test'
import { createInviteCode, fillSolution, resetAndSeed, todaySolution, typedLetter } from './support'

test.beforeEach(async () => {
  await resetAndSeed()
})

test('convite, cadastro, biblioteca, jogo, conclusão, modo leitura e jogar de novo', async ({
  page,
}) => {
  const code = createInviteCode()

  await page.goto('/')
  await expect(page).toHaveURL(/\/login/)
  await page.getByRole('link', { name: /criar conta/i }).click()
  await page.getByLabel(/código do convite/i).fill(code)
  await page.getByLabel('E-mail').fill('ana@exemplo.com')
  await page.getByLabel('Senha').fill('uma-senha-longa-123')
  await page.getByRole('button', { name: 'Criar conta' }).click()

  await expect(page.getByRole('heading', { name: 'Escolha um dia' })).toBeVisible()
  await page.getByRole('link', { name: /jogar a de hoje/i }).click()

  const board = page.getByRole('grid')
  await expect(board).toBeVisible()
  await expect(page.getByText(/Fonte: /)).toBeVisible()

  // Primeira palavra só com o teclado: o foco já está no tabuleiro.
  const solution = await todaySolution(page.request)
  const first = solution[0] ?? []
  const firstLetters = first.filter((letter): letter is string => Boolean(letter)).map(typedLetter)
  for (const letter of firstLetters) await page.keyboard.press(letter)
  await expect(
    page.getByRole('gridcell', { name: new RegExp(`letra ${firstLetters[0]}$`) }),
  ).toBeVisible()

  await fillSolution(page, solution)

  const dialog = page.getByRole('dialog', { name: 'Cruzada concluída' })
  await expect(dialog).toBeVisible()
  await expect(dialog.getByText('Seu tempo')).toBeVisible()

  await dialog.getByRole('button', { name: 'Ver o tabuleiro' }).click()
  await expect(page.getByText(/Concluída em \d/).first()).toBeVisible()
  await expect(board).toHaveAttribute('aria-readonly', 'true')

  await page.getByRole('button', { name: 'Jogar de novo' }).click()
  await expect(page.getByText(/Concluída em \d/).first()).toBeHidden()
  await expect(page.getByText('0/4 Letra')).toBeVisible()
})
