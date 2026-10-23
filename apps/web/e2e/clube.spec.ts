import AxeBuilder from '@axe-core/playwright'
import { expect, test, type Page } from '@playwright/test'
import {
  box,
  brasiliaToday,
  css,
  expectNear,
  pressLetter,
  probe,
  resetAndSeed,
  typedLetter,
} from './support'

test.beforeEach(async () => {
  await resetAndSeed()
})

// O contraste dos estados do tabuleiro é uma exceção assumida (feature 010, FR-026).
const axe = (page: Page) => new AxeBuilder({ page }).exclude('[role="grid"]')

const card = (page: Page, source: string) =>
  page.getByRole('link', { name: new RegExp(`^${source}: `) })

// A cruzada de exemplo do seed: 4 x 3 sem blocos, vizinhas coladas (letras em maiúscula).
async function clubeSolution(page: Page): Promise<(string | null)[][]> {
  const response = await page.request.get(
    `/api/puzzles?level=daily&date=${brasiliaToday()}&source=clube`,
  )
  return ((await response.json()) as { solution: { cells: (string | null)[][] } }).solution.cells
}

const cell = (page: Page, row: number, col: number) =>
  page.getByRole('gridcell', { name: new RegExp(`^Linha ${row + 1}, coluna ${col + 1},`) })

async function openClube(page: Page) {
  await page.goto('/')
  await card(page, 'Cruzadas Clube').click()
  await expect(page.getByRole('grid')).toBeVisible()
}

test('três cartões e três abas; abre a Cruzadas Clube pelo cartão de hoje', async ({ page }) => {
  await page.goto('/')
  await expect(page.getByRole('heading', { level: 1, name: 'Hoje' })).toBeVisible()
  await expect(page.getByRole('tab')).toHaveCount(3)
  await expect(page.getByRole('tab', { name: /^Cruzadas Clube/ })).toBeVisible()
  expect((await axe(page).analyze()).violations).toEqual([])

  await card(page, 'Cruzadas Clube').click()
  await expect(page.getByRole('heading', { level: 1 })).toContainText('Cruzadas Clube')
})

test('as barras ficam entre as palavras vizinhas e não mexem no tamanho das células', async ({
  page,
}) => {
  await openClube(page)
  const fim = cell(page, 0, 1)
  const outra = cell(page, 0, 2)
  await expect(fim).toHaveAttribute('data-bar-across', 'true')
  await expect(cell(page, 1, 1)).toHaveAttribute('data-bar-across', 'true')
  await expect(page.locator('[data-bar-across]')).toHaveCount(2)
  await expect(outra).not.toHaveAttribute('data-bar-across', 'true')

  const before = await box(fim)
  // A barra é uma sombra interna na cor do token: aparece no estilo da célula, nos dois temas.
  for (const theme of ['light', 'dark'] as const) {
    await page.emulateMedia({ colorScheme: theme })
    await page.evaluate(
      (value) => document.documentElement.setAttribute('data-theme', value),
      theme,
    )
    const bar = await probe(page, 'background-color', 'var(--bar)')
    expect(await css(page.locator('[data-bar-across]').first(), 'box-shadow')).toContain(bar)
  }
  const after = await box(fim)
  expectNear(after.width, before.width)
  expectNear(after.height, before.height)
})

test('digitar, Tab, setas, Home, End e Delete respeitam o limite de cada palavra', async ({
  page,
}) => {
  await openClube(page)
  const grid = page.getByRole('grid')
  const active = async () => grid.getAttribute('aria-activedescendant')
  const boardBefore = await box(grid)

  // A primeira palavra é AB (linha 1, colunas 1 e 2): ao digitar as duas, o cursor para na segunda.
  // O jogo abre com o foco no tabuleiro e a primeira célula selecionada (clicar nela trocaria a
  // direção).
  expect(await active()).toBe('cell-0-0')
  const solution = await clubeSolution(page)
  await pressLetter(page, typedLetter(solution[0]![0]!))
  await pressLetter(page, typedLetter(solution[0]![1]!))
  expect(await active()).toBe('cell-0-1')
  // Mais uma letra troca a da última célula, sem passar para a vizinha.
  await pressLetter(page, typedLetter(solution[0]![1]!))
  expect(await active()).toBe('cell-0-1')

  await page.keyboard.press('Home')
  expect(await active()).toBe('cell-0-0')
  await page.keyboard.press('End')
  expect(await active()).toBe('cell-0-1')

  // Delete limpa sem mover.
  await page.keyboard.press('Delete')
  expect(await active()).toBe('cell-0-1')
  await expect(cell(page, 0, 1)).toHaveAccessibleName(/vazia$/)

  // Tab vai para a palavra seguinte; a seta atravessa para a vizinha colada.
  await page.keyboard.press('Tab')
  expect(await active()).toBe('cell-0-2')
  await page.keyboard.press('ArrowLeft')
  expect(await active()).toBe('cell-0-1')
  await page.keyboard.press('ArrowRight')
  expect(await active()).toBe('cell-0-2')
  await page.keyboard.press('Home')
  expect(await active()).toBe('cell-0-2')
  await page.keyboard.press('End')
  expect(await active()).toBe('cell-0-3')

  const boardAfter = await box(grid)
  expectNear(boardAfter.width, boardBefore.width)
  expectNear(boardAfter.height, boardBefore.height)
})

test('o visitante completa a cruzada e o progresso não aparece nas outras fontes', async ({
  page,
}) => {
  await openClube(page)
  const solution = await clubeSolution(page)
  // Palavra a palavra: AB, CD / EF, GH / IJKL (a seção de cima de cada linha, depois a de baixo).
  const words: [number, number, number][] = [
    [0, 0, 2],
    [0, 2, 2],
    [1, 0, 2],
    [1, 2, 2],
    [2, 0, 4],
  ]
  for (const [row, col, length] of words) {
    // A primeira célula já vem selecionada: clicar nela trocaria a direção.
    if (row !== 0 || col !== 0) await cell(page, row, col).click()
    for (let offset = 0; offset < length; offset++) {
      await pressLetter(page, typedLetter(solution[row]![col + offset]!))
    }
  }
  await expect(page.getByRole('dialog', { name: 'Cruzada concluída' })).toBeVisible()
  await page.getByRole('button', { name: 'Ver o tabuleiro' }).click()

  await page.goto('/')
  await expect(page.getByRole('link', { name: /^Cruzadas Clube: concluída/ })).toBeVisible()
  await expect(page.getByRole('link', { name: /^O Globo: não iniciada/ })).toBeVisible()
  await expect(page.getByRole('link', { name: /^Cruzada Online: não iniciada/ })).toBeVisible()
})

test('um dia passado sem edição aparece sem cruzada e não vai à API de puzzle', async ({
  page,
}) => {
  const puzzleRequests: string[] = []
  page.on('request', (request) => {
    if (/\/api\/puzzles(\?|\/)/.test(request.url())) puzzleRequests.push(request.url())
  })

  await page.goto('/')
  await page.getByRole('tab', { name: /^Cruzadas Clube/ }).click()
  const table = page.getByRole('table')
  // Só o dia salvo (hoje) é link; os demais dias passados são "sem cruzada", sem busca.
  await expect(table.locator('a[href^="/dia/"]')).toHaveCount(0)
  await expect(table.getByRole('img', { name: /sem cruzada neste dia/ }).first()).toBeVisible()
  expect(puzzleRequests).toEqual([])

  // O endereço direto de um dia sem edição mostra a mesma mensagem.
  await page.goto('/dia/2026-01-05?fonte=clube')
  await expect(
    page.getByRole('heading', { level: 1, name: 'Não há cruzada neste dia.' }),
  ).toBeVisible()
  expect((await axe(page).analyze()).violations).toEqual([])
})

test('em janela estreita não há rolagem lateral', async ({ page }) => {
  await page.setViewportSize({ width: 360, height: 740 })
  await openClube(page)
  const overflow = await page.evaluate(
    () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
  )
  expect(overflow).toBeLessThanOrEqual(0)
})
