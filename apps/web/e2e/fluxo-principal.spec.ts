import { expect, test } from '@playwright/test'
import { fillSolution, resetAndSeed, todaySolution, typedLetter } from './support'

test.beforeEach(async () => {
  await resetAndSeed()
})

// A API do E2E sobe com REGISTRATION_ENABLED=true (CI e quickstart): o cadastro está aberto.
test('cadastro sem convite, biblioteca, jogo, conclusão, modo leitura e jogar de novo', async ({
  page,
}) => {
  await page.goto('/')
  await page.getByRole('link', { name: 'Entrar' }).click()
  await page.getByRole('link', { name: /criar conta/i }).click()
  // O login também tem "E-mail": espera a tela de cadastro antes de preencher.
  await expect(page.getByRole('heading', { name: 'Criar conta' })).toBeVisible()
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
