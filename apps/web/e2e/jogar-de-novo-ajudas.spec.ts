import { expect, test, type Page } from '@playwright/test'
import { fillSolution, login, resetAndSeed, todaySolution } from './support'

test.beforeEach(async () => {
  await resetAndSeed()
})

// Issue #86: "Jogar de novo" tem de devolver o limite completo de ajudas, sem marcas, e o
// reinício não pode ser desfeito por recarregar a página.
const lettersFull = (page: Page) => page.getByText(/^0\/\d+ Letra$/)
const wordsFull = (page: Page) => page.getByText(/^0\/\d+ Palavra$/)

async function openGlobo(page: Page) {
  await page.getByRole('link', { name: /^O Globo: / }).click()
  await expect(page.getByRole('grid')).toBeVisible()
}

// Usa uma ajuda de letra e uma de palavra, conclui a cruzada e escolhe "Jogar de novo".
async function useHelpsFinishAndPlayAgain(page: Page) {
  await page.getByRole('button', { name: /Revelar letra/ }).click()
  await page.getByRole('button', { name: /Revelar palavra/ }).click()
  await expect(page.getByText(/^[1-9]\d*\/\d+ Letra$/)).toBeVisible()
  await expect(page.getByText(/^[1-9]\d*\/\d+ Palavra$/)).toBeVisible()
  await expect(page.getByRole('gridcell', { name: /com ajuda/ }).first()).toBeVisible()

  await fillSolution(page, await todaySolution(page.request))
  const dialog = page.getByRole('dialog', { name: 'Cruzada concluída' })
  await expect(dialog).toBeVisible()
  await dialog.getByRole('button', { name: 'Ver o tabuleiro' }).click()
  await page.getByRole('button', { name: 'Jogar de novo' }).click()
}

async function expectHelpsReset(page: Page) {
  await expect(lettersFull(page)).toBeVisible()
  await expect(wordsFull(page)).toBeVisible()
  await expect(page.getByRole('gridcell', { name: /com ajuda/ })).toHaveCount(0)
}

test('visitante: jogar de novo zera as ajudas, também depois de recarregar', async ({ page }) => {
  await page.goto('/calendario')
  await openGlobo(page)
  await useHelpsFinishAndPlayAgain(page)
  await expectHelpsReset(page)

  await page.reload()
  await expect(page.getByRole('grid')).toBeVisible()
  await expectHelpsReset(page)
})

test('conta: jogar de novo zera as ajudas, também depois de recarregar', async ({ page }) => {
  await login(page)
  await openGlobo(page)
  await useHelpsFinishAndPlayAgain(page)
  await expectHelpsReset(page)

  await page.reload()
  await expect(page.getByRole('grid')).toBeVisible()
  await expectHelpsReset(page)
})

// Duas abas da mesma cruzada: a aba aberta com a ajuda já usada guarda o jogo antigo e não pode
// devolvê-lo depois que a outra jogou de novo (issue #86).
// devolvê-lo depois que a outra jogou de novo.
for (const kind of ['visitante', 'conta'] as const) {
  test(`${kind}: a outra aba não devolve as ajudas depois de jogar de novo`, async ({
    page,
    context,
  }) => {
    if (kind === 'conta') await login(page)
    else await page.goto('/calendario')
    await openGlobo(page)
    await page.getByRole('button', { name: /Revelar letra/ }).click()
    await expect(page.getByText(/^[1-9]\d*\/\d+ Letra$/)).toBeVisible()
    // Dá tempo de o visitante gravar a ajuda no navegador antes de abrir a outra aba.
    await page.waitForTimeout(1500)

    const other = await context.newPage()
    await other.goto(page.url())
    await expect(other.getByText(/^[1-9]\d*\/\d+ Letra$/)).toBeVisible()

    await page.bringToFront()
    await fillSolution(page, await todaySolution(page.request))
    const dialog = page.getByRole('dialog', { name: 'Cruzada concluída' })
    await dialog.getByRole('button', { name: 'Ver o tabuleiro' }).click()
    await page.getByRole('button', { name: 'Jogar de novo' }).click()
    await expectHelpsReset(page)

    // A aba antiga segue jogando: digita uma letra numa célula vazia e espera o salvamento.
    await other.bringToFront()
    await other.getByRole('gridcell', { name: /vazia/ }).first().click()
    await other.keyboard.press('Z')
    await other.waitForTimeout(2500)

    await page.bringToFront()
    await page.reload()
    await expect(page.getByRole('grid')).toBeVisible()
    await expectHelpsReset(page)
  })
}
