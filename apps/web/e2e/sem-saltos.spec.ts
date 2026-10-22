import AxeBuilder from '@axe-core/playwright'
import { expect, test, type Locator, type Page } from '@playwright/test'
import {
  box,
  css,
  expectNear,
  fillSolution,
  login,
  pressLetter,
  probe,
  resetAndSeed,
  solveFirstAcrossWord,
  todayPuzzle,
} from './support'

test.beforeEach(async () => {
  await resetAndSeed()
})

// Dica inventada, longa o bastante para não caber numa linha da barra em nenhuma largura.
const LONG_CLUE =
  'Uma dica inventada e muito comprida, escrita só para este teste, que fala de um lugar imaginário ' +
  'onde as palavras cruzadas crescem em árvores altas, são colhidas de manhã cedo e levadas à feira ' +
  'em cestos de vime pintados de azul e amarelo'

// As dicas do seed são curtas: troca a dica das palavras de índice par pela dica longa, só dentro do
// navegador do teste. Não toca na biblioteca nem no progresso.
async function lengthenClues(page: Page) {
  await page.route(/\/api\/puzzles(\?|\/)/, async (route) => {
    const response = await route.fetch()
    if (!response.ok()) return route.fulfill({ response })
    const json = (await response.json()) as { puzzle: { words: { clue: string }[] } }
    for (const [index, word] of json.puzzle.words.entries()) {
      if (index % 2 === 0) word.clue = LONG_CLUE
    }
    await route.fulfill({ response, json })
  })
}

async function openToday(page: Page) {
  await page.goto('/')
  await page.getByRole('link', { name: /^O Globo: / }).click()
  await expect(page.getByRole('grid')).toBeVisible()
}

// A região viva da barra da dica ativa e o texto da dica dentro dela (o que não é o número).
function activeClue(page: Page) {
  return page.locator('[aria-live="polite"][aria-atomic="true"]')
}

function activeClueText(page: Page) {
  return activeClue(page).locator('span')
}

// Caixas de cada item da faixa de ferramentas (e dos itens dentro dos grupos) e do tabuleiro.
async function toolbarAndBoardBoxes(page: Page) {
  const toolbar = page.getByRole('toolbar', { name: 'Ferramentas do jogo' })
  const items = [
    ...(await toolbar.locator(':scope > *').all()),
    ...(await toolbar.locator(':scope > * > *').all()),
    page.getByRole('grid'),
  ]
  return Promise.all(items.map((item) => box(item)))
}

async function noSaveText(page: Page) {
  await expect(page.getByText('Salvo', { exact: true })).toHaveCount(0)
  await expect(page.getByText('Salvando…')).toHaveCount(0)
  await expect(page.getByText('Salvo neste aparelho')).toHaveCount(0)
}

// Digita 20 letras a partir da primeira célula e confere, a cada letra, que nenhum texto de
// salvamento aparece. O relógio da faixa usa `tabular-nums`: a passagem dos segundos não muda a
// largura.
async function type20Letters(page: Page) {
  await page
    .getByRole('gridcell', { name: /^Linha 1, coluna \d+, vazia/ })
    .first()
    .click()
  for (let count = 0; count < 20; count += 1) {
    await pressLetter(page, 'A')
    await noSaveText(page)
  }
}

test.describe('US1: a faixa de ferramentas não pula ao salvar', () => {
  test('com conta: nada de "Salvando…"/"Salvo", nada se move e as letras ficam salvas', async ({
    page,
  }) => {
    await login(page)
    await openToday(page)
    const before = await toolbarAndBoardBoxes(page)
    const saved = page.waitForResponse(
      (response) =>
        response.request().method() === 'PUT' &&
        response.url().includes('/api/progress/') &&
        response.ok(),
    )
    await type20Letters(page)
    await saved
    await noSaveText(page)
    expect(await toolbarAndBoardBoxes(page)).toEqual(before)

    await page.reload()
    await expect(page.getByRole('grid')).toBeVisible()
    await expect(page.getByRole('gridcell', { name: /letra A$/ }).first()).toBeVisible()
  })

  test('visitante: o texto fixo fica igual e nada se move', async ({ page }) => {
    await openToday(page)
    await expect(page.getByText('Progresso só neste aparelho')).toBeVisible()
    const before = await toolbarAndBoardBoxes(page)
    await type20Letters(page)
    // O salvamento do visitante tem a mesma espera; dá tempo a ele terminar antes de medir.
    await page.waitForTimeout(2_000)
    await noSaveText(page)
    await expect(page.getByText('Progresso só neste aparelho')).toBeVisible()
    expect(await toolbarAndBoardBoxes(page)).toEqual(before)
  })
})

// A barra inteira (a região viva fica dentro dela, entre anterior e próxima no computador).
function clueBar(page: Page) {
  return activeClue(page).locator('..')
}

function overflow(locator: Locator) {
  return locator.evaluate((element) => {
    const style = getComputedStyle(element)
    return {
      whiteSpace: style.whiteSpace,
      textOverflow: style.textOverflow,
      cut: element.scrollWidth > element.clientWidth,
    }
  })
}

function cluesAside(page: Page) {
  return page.getByRole('complementary', { name: 'Dicas' })
}

// O primeiro item da coluna do tabuleiro: a barra da dica ou, na cruzada concluída, a faixa de modo
// leitura (feature 018).
function boardHead(page: Page) {
  return page.getByRole('region', { name: 'Tabuleiro' }).locator(':scope > :first-child')
}

type Box = { x: number; y: number; width: number; height: number }

// Mesma posição horizontal e mesma largura, com a tolerância de `expectNear`.
function expectSameSpan(a: Box, b: Box) {
  expectNear(a.x, b.x)
  expectNear(a.width, b.width)
}

// Leva a alça do tabuleiro ao mínimo (Home) ou ao maior tamanho que cabe (End).
async function setCellSize(page: Page, key: 'Home' | 'End') {
  const handle = page.getByRole('slider', { name: 'Tamanho do tabuleiro' })
  await handle.focus()
  await page.keyboard.press(key)
  if (key === 'Home') await expect(handle).toHaveAttribute('aria-valuenow', '30')
}

// Percorre todas as palavras com Tab (o tabuleiro cicla as palavras, feature 011) e confere, a cada
// passo, que o tabuleiro não se move e a barra não muda de altura (SC-001). Na dica longa, o texto
// fica numa linha com reticências e o número com a direção cabe inteiro (FR-007, SC-003). Com
// `matchGrid` (computador, feature 018), a barra tem a posição e a largura da grade e a coluna de
// dicas não sai do lugar.
async function walkWords(page: Page, options: { boardFixed: boolean; matchGrid?: boolean }) {
  const { puzzle } = await todayPuzzle(page.request)
  const grid = await box(page.getByRole('grid'))
  const bar = await box(clueBar(page))
  // No celular com teclado na tela não há coluna de dicas.
  const clues = options.matchGrid ? await box(cluesAside(page)) : null
  let longSeen = 0
  let shortSeen = 0
  for (let step = 0; step <= puzzle.words.length; step += 1) {
    if (step > 0) await page.keyboard.press('Tab')
    if (options.boardFixed) expect((await box(page.getByRole('grid'))).y).toBe(grid.y)
    expect((await box(clueBar(page))).height).toBe(bar.height)
    if (clues) {
      expectSameSpan(await box(clueBar(page)), await box(page.getByRole('grid')))
      expect((await box(cluesAside(page))).x).toBe(clues.x)
    }
    const text = activeClueText(page)
    const state = await overflow(text)
    expect(state.whiteSpace).toBe('nowrap')
    expect(state.textOverflow).toBe('ellipsis')
    if ((await text.textContent()) === LONG_CLUE) {
      expect(state.cut).toBe(true)
      expect((await overflow(activeClue(page).locator('b'))).cut).toBe(false)
      // A dica numa linha não pode alargar a coluna do tabuleiro além da janela.
      expect(
        await page.evaluate(
          () => document.documentElement.scrollWidth <= document.documentElement.clientWidth,
        ),
      ).toBe(true)
      longSeen += 1
    } else {
      expect(state.cut).toBe(false)
      shortSeen += 1
    }
  }
  expect(longSeen).toBeGreaterThan(0)
  expect(shortSeen).toBeGreaterThan(0)
}

test.describe('US2: a barra da dica ativa fica numa linha', () => {
  test('computador: o tabuleiro não se move ao trocar de palavra', async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 800 })
    await lengthenClues(page)
    await openToday(page)
    // A cruzada abre com a primeira palavra horizontal escolhida: não há estado "sem célula".
    await walkWords(page, { boardFixed: true, matchGrid: true })
  })

  // Entre 721 e 860 px, com mouse, não há teclado na tela e a barra fica na coluna de dicas, abaixo
  // do tabuleiro (FR-006).
  test('janela estreita sem teclado na tela: a barra na coluna de dicas também', async ({
    page,
  }) => {
    await page.setViewportSize({ width: 800, height: 900 })
    await lengthenClues(page)
    await openToday(page)
    await expect(
      page
        .getByRole('complementary', { name: 'Dicas' })
        .locator('[aria-live="polite"][aria-atomic="true"]'),
    ).toBeVisible()
    await walkWords(page, { boardFixed: true })
  })
})

test.describe('US2 no celular com teclado na tela', () => {
  test.use({ viewport: { width: 360, height: 740 }, hasTouch: true, isMobile: true })

  test('a barra acima do tabuleiro fica numa linha e o tabuleiro não se move', async ({ page }) => {
    await lengthenClues(page)
    await openToday(page)
    await walkWords(page, { boardFixed: true })
  })

  // Feature 018: com toque não há mouse parado, então o balão da dica completa não aparece.
  test('tocar na dica não abre o balão', async ({ page }) => {
    await lengthenClues(page)
    await openToday(page)
    await expect(activeClueText(page)).toHaveText(LONG_CLUE)
    await activeClueText(page).tap()
    await page.waitForTimeout(1_000)
    await expect(page.getByTestId('full-clue')).toHaveCount(0)
  })
})

function cell(page: Page, word: { row: number; col: number }) {
  return page.getByRole('gridcell', {
    name: new RegExp(`^Linha ${word.row + 1}, coluna ${word.col + 1},`),
  })
}

for (const theme of ['light', 'dark'] as const) {
  test(`US3: a dica resolvida fica riscada, com fundo de sucesso e visto, sem mexer na lista, tema ${theme}`, async ({
    page,
  }) => {
    await page.setViewportSize({ width: 1280, height: 800 })
    await page.addInitScript(
      (value) => window.localStorage.setItem('cruzadinha:theme', value),
      theme,
    )
    await openToday(page)
    await expect(page.locator('html')).toHaveAttribute('data-theme', theme)

    const group = page
      .getByRole('complementary', { name: 'Dicas' })
      .getByRole('region', { name: 'Horizontais' })
    const first = group.getByRole('button').first()
    const heights = async () => [(await box(first)).height, (await box(group)).height]
    const before = await heights()

    const { puzzle } = await solveFirstAcrossWord(page)
    const [firstWord, otherWord] = puzzle.words.filter((word) => word.direction === 'across')
    if (!firstWord || !otherWord) throw new Error('a cruzada de hoje deveria ter duas horizontais')
    await cell(page, otherWord).click()

    await expect(first).toHaveAccessibleName(/, resolvida$/)
    const check = first.locator('svg')
    await expect(check).toBeVisible()
    expect(await heights()).toEqual(before)
    // Riscada de novo (feature 019), com o texto na cor normal, sem ficar apagada.
    expect(await css(first, 'text-decoration-line')).toBe('line-through')
    expect(await css(first, 'color')).toBe(await probe(page, 'color', 'var(--ink)'))
    expect(await css(first, 'background-color')).toBe(
      await probe(page, 'background-color', 'var(--ok-tint)'),
    )
    // O contraste do visto com --ok-tint e --word está medido em research R7: aqui basta provar
    // que ele usa o token --ok (FR-012).
    expect(await css(check, 'stroke')).toBe(await probe(page, 'stroke', 'var(--ok)'))

    // Ativa e resolvida: o fundo da palavra ativa, com o visto.
    await cell(page, firstWord).click()
    await expect(first).toHaveAttribute('aria-current', 'true')
    expect(await css(first, 'background-color')).toBe(
      await probe(page, 'background-color', 'var(--word)'),
    )
    await expect(check).toBeVisible()
    expect(await css(first, 'text-decoration-line')).toBe('line-through')
    expect(await css(first, 'color')).toBe(await probe(page, 'color', 'var(--ink)'))
    // A barra da dica acima do tabuleiro nunca fica riscada (FR-014).
    expect(await css(clueBar(page), 'text-decoration-line')).toBe('none')

    // Desfeita: o risco e o visto somem e nada muda de altura.
    await page.keyboard.press('Delete')
    await expect(first).not.toHaveAccessibleName(/resolvida/)
    await expect(first.locator('svg')).toHaveCount(0)
    expect(await css(first, 'text-decoration-line')).toBe('none')
    expect(await heights()).toEqual(before)
  })
}

test('US3: no modo leitura todas as dicas aparecem resolvidas, riscadas e com o visto', async ({
  page,
}) => {
  await page.setViewportSize({ width: 1280, height: 800 })
  await openToday(page)
  const { puzzle, solution } = await todayPuzzle(page.request)
  await fillSolution(page, solution.cells)
  await page.getByRole('button', { name: 'Ver o tabuleiro' }).click()
  const clues = page.getByRole('complementary', { name: 'Dicas' })
  await expect(clues.getByRole('button').locator('svg')).toHaveCount(puzzle.words.length)
  for (const clue of await clues.getByRole('button').all()) {
    expect(await css(clue, 'text-decoration-line')).toBe('line-through')
  }
})

// Feature 018: no computador, a barra acompanha a grade; abaixo de 320 px usa uma largura mínima
// fixa, centralizada sobre a grade.
const CLUE_BAR_MIN = 320

async function expectBarFollowsGrid(page: Page, height: number) {
  const bar = await box(clueBar(page))
  const grid = await box(page.getByRole('grid'))
  expect(bar.height).toBe(height)
  if (grid.width >= CLUE_BAR_MIN) {
    expectSameSpan(bar, grid)
  } else {
    expectNear(bar.width, CLUE_BAR_MIN)
    expectNear(bar.x + bar.width / 2, grid.x + grid.width / 2)
  }
}

test.describe('018 US2: a barra acompanha o tamanho do tabuleiro', () => {
  test('mínimo, máximo, padrão e janela menor', async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 800 })
    await lengthenClues(page)
    await openToday(page)
    const { puzzle } = await todayPuzzle(page.request)
    const { height } = await box(clueBar(page))

    // A amostra do seed é 5 x 5: no mínimo a grade fica com menos de 320 px.
    await setCellSize(page, 'Home')
    expect((await box(page.getByRole('grid'))).width).toBeLessThan(CLUE_BAR_MIN)
    await page.getByRole('grid').focus()
    for (let step = 0; step <= puzzle.words.length; step += 1) {
      if (step > 0) await page.keyboard.press('Tab')
      await expectBarFollowsGrid(page, height)
      expect((await overflow(activeClue(page).locator('b'))).cut).toBe(false)
    }

    // O tabuleiro mede o espaço de novo depois de mudar de tamanho: espera o layout assentar.
    const settled = () =>
      expect(() => expectBarFollowsGrid(page, height)).toPass({ timeout: 2_000 })
    await setCellSize(page, 'End')
    await settled()
    await page.getByRole('button', { name: 'Tamanho padrão' }).click()
    await settled()
    await page.setViewportSize({ width: 1000, height: 800 })
    await settled()
  })

  test('a faixa de modo leitura segue a mesma regra', async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 800 })
    await openToday(page)
    const { solution } = await todayPuzzle(page.request)
    await fillSolution(page, solution.cells)
    await page.getByRole('button', { name: 'Ver o tabuleiro' }).click()
    expectSameSpan(await box(boardHead(page)), await box(page.getByRole('grid')))

    await setCellSize(page, 'Home')
    const banner = await box(boardHead(page))
    expectNear(banner.width, CLUE_BAR_MIN)
    // A faixa não alarga a coluna além do mínimo: as dicas começam um `column-gap` depois dela.
    const gap = await page
      .getByRole('region', { name: 'Tabuleiro' })
      .evaluate((section) =>
        Number.parseFloat(getComputedStyle(section.parentElement ?? section).columnGap),
      )
    expectNear((await box(cluesAside(page))).x, banner.x + banner.width + gap)
  })
})

type TextLine = { baseline: number; xCenter: number }

// Centro ótico da barra no computador (feature 019): o meio das minúsculas do número e da dica, do
// topo do "x" à linha de base, comparado com o meio da barra e o centro das setas. A linha de base
// vem de um marcador de altura zero alinhado a ela; a altura do "x", do canvas com a mesma fonte.
async function xHeightCenter(page: Page) {
  await page.evaluate(async () => {
    await document.fonts.ready
  })
  return activeClue(page).evaluate((live) => {
    const bar = live.parentElement
    const number = live.querySelector('b')
    const clue = live.querySelector('span')
    const context = document.createElement('canvas').getContext('2d')
    if (!bar || !number || !clue || !context) throw new Error('a barra deveria ter número e dica')
    const middle = (element: Element) => {
      const rect = element.getBoundingClientRect()
      return rect.top + rect.height / 2
    }
    const line = (element: Element): TextLine => {
      const marker = document.createElement('span')
      marker.style.cssText = 'display:inline-block;width:0;height:0;vertical-align:baseline'
      element.prepend(marker)
      const baseline = marker.getBoundingClientRect().top
      marker.remove()
      const style = getComputedStyle(element)
      context.font = `${style.fontWeight} ${style.fontSize} ${style.fontFamily}`
      return { baseline, xCenter: baseline - context.measureText('x').actualBoundingBoxAscent / 2 }
    }
    return {
      barCenter: middle(bar),
      arrowCenters: [...bar.querySelectorAll('button svg')].map(middle),
      number: line(number),
      clue: line(clue),
      numberX: number.getBoundingClientRect().x,
    }
  })
}

test.describe('019 US1: a dica fica no meio da altura da barra', () => {
  for (const theme of ['light', 'dark'] as const) {
    test(`centro ótico no meio da barra e das setas em todas as palavras, tema ${theme}`, async ({
      page,
    }) => {
      await page.setViewportSize({ width: 1280, height: 800 })
      await page.addInitScript(
        (value) => window.localStorage.setItem('cruzadinha:theme', value),
        theme,
      )
      await lengthenClues(page)
      await openToday(page)
      const { puzzle } = await todayPuzzle(page.request)
      let first: Awaited<ReturnType<typeof xHeightCenter>> | null = null
      let longSeen = 0
      let shortSeen = 0
      for (let step = 0; step <= puzzle.words.length; step += 1) {
        if (step > 0) await page.keyboard.press('Tab')
        const metrics = await xHeightCenter(page)
        expect(metrics.arrowCenters).toHaveLength(2)
        for (const line of [metrics.number, metrics.clue]) {
          expect(Math.abs(line.xCenter - metrics.barCenter)).toBeLessThanOrEqual(0.5)
          for (const arrow of metrics.arrowCenters) {
            expect(Math.abs(line.xCenter - arrow)).toBeLessThanOrEqual(0.5)
          }
        }
        expect(Math.abs(metrics.number.baseline - metrics.clue.baseline)).toBeLessThanOrEqual(0.1)
        // Sem salto entre dicas: mesma linha de base e mesmo começo à esquerda (SC-002, SC-004).
        first ??= metrics
        expect(Math.abs(metrics.clue.baseline - first.clue.baseline)).toBeLessThanOrEqual(0.1)
        expect(Math.abs(metrics.numberX - first.numberX)).toBeLessThanOrEqual(0.1)
        if ((await activeClueText(page).textContent()) === LONG_CLUE) longSeen += 1
        else shortSeen += 1
      }
      expect(longSeen).toBeGreaterThan(0)
      expect(shortSeen).toBeGreaterThan(0)
    })
  }
})

// Feature 018: com o mouse parado sobre a dica cortada, um balão mostra a dica inteira.
function fullClue(page: Page) {
  return page.getByTestId('full-clue')
}

async function openFullClue(page: Page) {
  await activeClueText(page).hover()
  await expect(fullClue(page)).toHaveText(LONG_CLUE, { timeout: 1_000 })
}

test.describe('018 US3: dica completa ao parar o mouse', () => {
  test.beforeEach(async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 800 })
    await lengthenClues(page)
  })

  test('abre acima da barra sem mover nada, atravessa o vão subindo e fecha ao sair', async ({
    page,
  }) => {
    await openToday(page)
    // A cruzada abre na primeira palavra, de índice 0: a dica longa.
    await expect(activeClueText(page)).toHaveText(LONG_CLUE)
    const boxes = async () =>
      Promise.all([
        box(page.getByRole('grid')),
        box(clueBar(page)),
        box(cluesAside(page)),
        box(page.getByRole('heading', { level: 1 })),
      ])
    const before = await boxes()

    await openFullClue(page)
    expect(await boxes()).toEqual(before)
    const bar = await box(clueBar(page))
    const balloon = await box(fullClue(page))
    const grid = await box(page.getByRole('grid'))
    expectNear(balloon.width, bar.width)
    // Acima da barra, a 4 px dela, sem cobrir a grade (feature 019).
    expectNear(balloon.y + balloon.height + 4, bar.y)
    expect(balloon.y + balloon.height).toBeLessThanOrEqual(grid.y)

    // Da dica até o balão em passos, subindo pelo vão entre os dois.
    const text = await box(activeClueText(page))
    const x = text.x + text.width / 2
    await page.mouse.move(x, text.y + text.height / 2)
    await page.mouse.move(x, balloon.y + balloon.height / 2, { steps: 20 })
    await expect(fullClue(page)).toBeVisible()

    await page.mouse.move(0, 0)
    await expect(fullClue(page)).toHaveCount(0)
    expect(await boxes()).toEqual(before)
  })

  test('Esc fecha sem mudar o Esc do tabuleiro, e trocar de palavra fecha', async ({ page }) => {
    await openToday(page)
    // Focar a grade não muda a seleção; clicar na célula selecionada trocaria a direção.
    await page.getByRole('grid').focus()
    await openFullClue(page)
    await page.keyboard.press('Escape')
    await expect(fullClue(page)).toHaveCount(0)
    await page.keyboard.press('Tab')
    await expect(page.getByRole('slider', { name: 'Tamanho do tabuleiro' })).toBeFocused()

    await page.mouse.move(0, 0)
    await openFullClue(page)
    await page.getByRole('button', { name: 'Próxima dica' }).click()
    await expect(fullClue(page)).toHaveCount(0)
  })

  test('dica curta: nenhum balão', async ({ page }) => {
    await openToday(page)
    const { puzzle } = await todayPuzzle(page.request)
    await page.getByRole('grid').focus()
    for (let step = 0; step < puzzle.words.length; step += 1) {
      if ((await activeClueText(page).textContent()) !== LONG_CLUE) break
      await page.keyboard.press('Tab')
    }
    await expect(activeClueText(page)).not.toHaveText(LONG_CLUE)
    await activeClueText(page).hover()
    await page.waitForTimeout(1_000)
    await expect(fullClue(page)).toHaveCount(0)
  })

  for (const theme of ['light', 'dark'] as const) {
    test(`cores do tema e acessibilidade com o balão aberto, tema ${theme}`, async ({ page }) => {
      await page.addInitScript(
        (value) => window.localStorage.setItem('cruzadinha:theme', value),
        theme,
      )
      await openToday(page)
      await expect(page.locator('html')).toHaveAttribute('data-theme', theme)
      await openFullClue(page)
      // O axe pode pular conteúdo `aria-hidden`: as cores são conferidas contra os tokens.
      expect(await css(fullClue(page), 'color')).toBe(await probe(page, 'color', 'var(--ink)'))
      expect(await css(fullClue(page), 'background-color')).toBe(
        await probe(page, 'background-color', 'var(--surface)'),
      )
      const results = await new AxeBuilder({ page }).exclude('[role="grid"]').analyze()
      expect(results.violations).toEqual([])
    })
  }

  test('sem espaço acima, o balão abre abaixo', async ({ page }) => {
    await openToday(page)
    await expect(activeClueText(page)).toHaveText(LONG_CLUE)
    // Espaço extra no fim só neste teste, para a página rolar qualquer que seja a cruzada.
    await page.evaluate(() => {
      document.body.style.paddingBottom = '2000px'
    })
    const top = await clueBar(page).evaluate((bar) => {
      window.scrollBy(0, bar.getBoundingClientRect().top - 8)
      return bar.getBoundingClientRect().top
    })
    expect(top).toBeGreaterThanOrEqual(0)
    expect(top).toBeLessThanOrEqual(20)

    await openFullClue(page)
    const bar = await box(clueBar(page))
    const balloon = await box(fullClue(page))
    expect(balloon.y).toBeGreaterThanOrEqual(bar.y + bar.height)
    expect(balloon.y).toBeGreaterThanOrEqual(0)
  })

  // Na janela estreita a barra fica abaixo do tabuleiro: o balão continua abaixo dela, como na
  // feature 018, para não cobrir a grade (feature 019, FR-018).
  test('janela estreita sem teclado na tela: o balão aparece abaixo da barra', async ({ page }) => {
    await page.setViewportSize({ width: 800, height: 900 })
    await openToday(page)
    await expect(activeClueText(page)).toHaveText(LONG_CLUE)
    await openFullClue(page)
    const bar = await box(clueBar(page))
    const balloon = await box(fullClue(page))
    const grid = await box(page.getByRole('grid'))
    expect(balloon.y).toBeGreaterThanOrEqual(bar.y + bar.height)
    expect(balloon.y).toBeGreaterThanOrEqual(grid.y + grid.height)
  })
})
