import AxeBuilder from '@axe-core/playwright'
import { expect, test, type Page } from '@playwright/test'
import { brasiliaToday, fillSolution, pressLetter, progressRowCount, resetAndSeed } from './support'

test.beforeEach(async () => {
  await resetAndSeed()
})

// O contraste dos estados do tabuleiro é uma exceção assumida (feature 010, FR-026).
const axe = (page: Page) => new AxeBuilder({ page }).exclude('[role="grid"]')

const todayCell = (page: Page, state: string) =>
  page.getByRole('link', { name: new RegExp(`^Hoje, .*, ${state}$`) })

const card = (page: Page, source: string) =>
  page.getByRole('link', { name: new RegExp(`^${source}: `) })

test('visitante abre a Cruzada Online pelo cartão, joga e o progresso não aparece no O Globo', async ({
  page,
}) => {
  await page.goto('/')
  await expect(page.getByRole('heading', { level: 1, name: 'Hoje' })).toBeVisible()
  const globo = page.getByRole('tab', { name: /^O Globo/ })
  const cruzada = page.getByRole('tab', { name: /^Cruzada Online/ })
  await expect(globo).toHaveAttribute('aria-selected', 'true')
  expect((await axe(page).analyze()).violations).toEqual([])

  // SC-001: a cruzada de hoje de qualquer fonte com um toque, sem trocar a aba antes.
  await card(page, 'Cruzada Online').click()
  await expect(page.getByRole('grid')).toBeVisible()
  await expect(page.getByRole('heading', { level: 1 })).toContainText('Cruzada Online')

  // A fixture do exemplo tem Ç na linha 3, coluna 3: o jogador digita Ç e a letra conta como certa.
  await page.getByRole('gridcell', { name: /^Linha 3, coluna 3,/ }).click()
  await pressLetter(page, 'Ç')
  await expect(page.getByRole('gridcell', { name: /^Linha 3, coluna 3, letra Ç/ })).toBeVisible()
  await page.getByRole('button', { name: 'Verificar' }).click()
  await expect(page.getByText('Verificado: nenhuma letra errada')).toBeAttached()
  await expect(page.getByText('Progresso só neste aparelho')).toBeVisible()

  await page.goto('/')
  await expect(page.getByRole('link', { name: /^Cruzada Online: em andamento/ })).toBeVisible()
  await expect(page.getByRole('link', { name: /^O Globo: não iniciada/ })).toBeVisible()
  await expect(todayCell(page, 'não iniciado')).toBeVisible()

  // Abas: a escolha muda o calendário, fica guardada e as setas também trocam.
  await cruzada.click()
  await expect(todayCell(page, 'em andamento')).toBeVisible()
  await page.reload()
  await expect(cruzada).toHaveAttribute('aria-selected', 'true')
  await cruzada.focus()
  await page.keyboard.press('ArrowRight')
  await expect(globo).toHaveAttribute('aria-selected', 'true')
  await expect(globo).toBeFocused()
  await expect(todayCell(page, 'não iniciado')).toBeVisible()

  expect(await progressRowCount()).toBe(0)
})

test('ao concluir o O Globo, o diálogo oferece a Cruzada Online do mesmo dia', async ({ page }) => {
  await page.goto('/')
  await card(page, 'O Globo').click()
  await expect(page.getByRole('grid')).toBeVisible()
  const response = await page.request.get(
    `/api/puzzles?level=daily&date=${brasiliaToday()}&source=oglobo`,
  )
  const { solution } = (await response.json()) as { solution: { cells: (string | null)[][] } }
  await fillSolution(page, solution.cells)

  const dialog = page.getByRole('dialog', { name: 'Cruzada concluída' })
  await expect(dialog).toBeVisible()
  const shortcut = dialog.getByRole('link', { name: 'Jogar Cruzada Online deste dia' })
  await expect(shortcut).toBeVisible()
  await shortcut.click()
  await expect(page.getByRole('heading', { level: 1 })).toContainText('Cruzada Online')
})

for (const viewport of [
  { width: 360, height: 640 },
  { width: 1280, height: 800 },
]) {
  test(`em ${viewport.width} x ${viewport.height}, cartões e abas aparecem sem rolar`, async ({
    page,
  }) => {
    await page.setViewportSize(viewport)
    for (const scheme of ['light', 'dark'] as const) {
      await page.emulateMedia({ colorScheme: scheme })
      await page.goto('/')
      await expect(page.getByRole('heading', { level: 1, name: 'Hoje' })).toBeVisible()
      // SC-002: todas as fontes e a situação de hoje na primeira tela.
      await expect(card(page, 'O Globo')).toBeInViewport()
      await expect(card(page, 'Cruzada Online')).toBeInViewport()
      await expect(page.getByRole('tablist', { name: 'Fonte do calendário' })).toBeInViewport()
      // FR-015: a página não rola para os lados.
      const overflow = await page.evaluate(
        () => document.documentElement.scrollWidth - window.innerWidth,
      )
      expect(overflow).toBeLessThanOrEqual(0)
      expect((await axe(page).analyze()).violations).toEqual([])
    }
  })
}
