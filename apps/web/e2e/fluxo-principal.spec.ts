import { expect, test } from '@playwright/test'
import {
  createAccount,
  fillSolution,
  login,
  resetAndSeed,
  todaySolution,
  typedLetter,
} from './support'

test.beforeEach(async () => {
  await resetAndSeed()
})

// O cadastro só cria a conta depois de o e-mail ser confirmado (feature 035); o e-mail não é lido
// aqui, então a conta vem da CLI do autor e o cadastro por link é coberto em
// `confirmar-email.spec.ts`, com a API simulada.
test('conta criada pela CLI, biblioteca, jogo, conclusão, modo leitura e jogar de novo', async ({
  page,
}) => {
  createAccount('ana@exemplo.com', 'uma-senha-longa-123')
  await login(page, 'ana@exemplo.com', 'uma-senha-longa-123')

  await expect(page.getByRole('heading', { level: 1, name: 'Hoje' })).toBeVisible()
  await page.getByRole('link', { name: /^O Globo: / }).click()

  const board = page.getByRole('grid')
  await expect(board).toBeVisible()
  await expect(page.getByText(/Fonte: /).first()).toBeVisible()

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
