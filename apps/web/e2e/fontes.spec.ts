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

  // Abas: a escolha muda o calendário e as setas também trocam. A aba não fica guardada: ao
  // recarregar, o calendário abre na cruzada padrão (feature 021).
  await cruzada.click()
  await expect(todayCell(page, 'em andamento')).toBeVisible()
  await page.reload()
  await expect(globo).toHaveAttribute('aria-selected', 'true')
  await cruzada.click()
  await cruzada.focus()
  await page.keyboard.press('ArrowLeft')
  await expect(globo).toHaveAttribute('aria-selected', 'true')
  await expect(globo).toBeFocused()
  await expect(todayCell(page, 'não iniciado')).toBeVisible()

  expect(await progressRowCount()).toBe(0)
})

// Feature 031: o calendário volta na aba do jogo de onde a pessoa saiu e, ao abrir o site, na padrão.
test.describe('volta do jogo para o calendário', () => {
  const globo = (page: Page) => page.getByRole('tab', { name: /^O Globo/ })
  const cruzada = (page: Page) => page.getByRole('tab', { name: /^Cruzada Online/ })

  async function openOnlineGame(page: Page) {
    await page.goto('/')
    await cruzada(page).click()
    await page.getByRole('link', { name: /^Hoje, .*, não iniciado$/ }).click()
    await expect(page.getByRole('heading', { level: 1 })).toContainText('Cruzada Online')
  }

  test('o link, o cabeçalho e o botão Voltar do navegador voltam na Cruzada Online', async ({
    page,
  }) => {
    await openOnlineGame(page)
    await page.getByRole('link', { name: 'Escolher outro dia' }).click()
    await expect(cruzada(page)).toHaveAttribute('aria-selected', 'true')

    await page.goBack()
    await expect(page.getByRole('grid')).toBeVisible()
    await page.getByRole('link', { name: 'Cruzadinha' }).click()
    await expect(cruzada(page)).toHaveAttribute('aria-selected', 'true')

    await page.goBack()
    await page.goBack()
    await expect(cruzada(page)).toHaveAttribute('aria-selected', 'true')
  })

  test('o cartão de hoje de outra fonte também volta nessa fonte, sem mudar as configurações', async ({
    page,
  }) => {
    await page.goto('/')
    await card(page, 'Cruzada Online').click()
    await expect(page.getByRole('grid')).toBeVisible()
    await page.getByRole('link', { name: 'Escolher outro dia' }).click()
    await expect(cruzada(page)).toHaveAttribute('aria-selected', 'true')
    const saved = await page.evaluate(() => window.localStorage.getItem('cruzadinha:settings'))
    expect(JSON.parse(saved ?? '{}').settings.defaultSource).toBe('oglobo')
  })

  test('o diálogo de conclusão volta na fonte do jogo', async ({ page }) => {
    await page.goto('/')
    await card(page, 'Cruzada Online').click()
    await expect(page.getByRole('grid')).toBeVisible()
    const response = await page.request.get(
      `/api/puzzles?level=daily&date=${brasiliaToday()}&source=cruzadaonline`,
    )
    const { solution } = (await response.json()) as { solution: { cells: (string | null)[][] } }
    await fillSolution(page, solution.cells)
    const dialog = page.getByRole('dialog', { name: 'Cruzada concluída' })
    await dialog.getByRole('button', { name: 'Voltar à biblioteca' }).click()
    await expect(cruzada(page)).toHaveAttribute('aria-selected', 'true')
  })

  test('recarregar, ou ir ao login e voltar pelo cabeçalho, abre na cruzada padrão', async ({
    page,
  }) => {
    await openOnlineGame(page)
    await page.getByRole('link', { name: 'Escolher outro dia' }).click()
    await expect(cruzada(page)).toHaveAttribute('aria-selected', 'true')
    await page.reload()
    await expect(globo(page)).toHaveAttribute('aria-selected', 'true')

    await openOnlineGame(page)
    await page.getByRole('link', { name: 'Entrar', exact: true }).first().click()
    await expect(page).toHaveURL(/\/login/)
    await page.getByRole('link', { name: 'Cruzadinha' }).click()
    await expect(globo(page)).toHaveAttribute('aria-selected', 'true')
  })
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

test('quatro fontes (features 029 e 030): o cartão da Cruzadas Brasil abre o jogo em um toque', async ({
  page,
}) => {
  await page.goto('/')
  await expect(page.getByRole('tab')).toHaveCount(4)
  await expect(page.getByRole('tab').nth(2)).toHaveAccessibleName(/^Cruzadas Brasil/)

  // SC-008: um toque no cartão de hoje leva ao jogo.
  await card(page, 'Cruzadas Brasil').click()
  await expect(page.getByRole('grid')).toBeVisible()
  await expect(page.getByRole('heading', { level: 1 })).toContainText('Cruzadas Brasil')
  await expect(page.getByText('Fonte: Exemplo de desenvolvimento (seed)')).toBeVisible()

  // A fixture do exemplo tem Ç na linha 1, coluna 2: a letra simples ou a acentuada contam.
  await page.getByRole('gridcell', { name: /^Linha 1, coluna 2,/ }).click()
  await pressLetter(page, 'Ç')
  await expect(page.getByRole('gridcell', { name: /^Linha 1, coluna 2, letra Ç/ })).toBeVisible()

  await page.goto('/')
  await expect(page.getByRole('link', { name: /^Cruzadas Brasil: em andamento/ })).toBeVisible()
  await expect(page.getByRole('link', { name: /^O Globo: não iniciada/ })).toBeVisible()
  await expect(page.getByRole('link', { name: /^Cruzada Online: não iniciada/ })).toBeVisible()
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
      await expect(card(page, 'Cruzadas Brasil')).toBeInViewport()
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
