import AxeBuilder from '@axe-core/playwright'
import { expect, test, type Page } from '@playwright/test'
import { box, expectNear, resetAndSeed, solutionLetters, todayPuzzle, typeWord } from './support'

// Feature 032: copiar a dica com duplo clique e fechar os ajustes ao clicar fora.

test.beforeEach(async ({ context }) => {
  await resetAndSeed()
  await context.grantPermissions(['clipboard-read', 'clipboard-write'])
})

// O contraste dos estados do tabuleiro é uma exceção assumida (feature 010, FR-026).
const axe = (page: Page) => new AxeBuilder({ page }).exclude('[role="grid"]')

const SENTINEL = 'nada copiado'

const readClipboard = (page: Page) => page.evaluate(() => navigator.clipboard.readText())
const writeClipboard = (page: Page, text: string) =>
  page.evaluate((value) => navigator.clipboard.writeText(value), text)

async function openSettings(page: Page) {
  await page.getByRole('button', { name: 'Configurações' }).click()
  return page.getByRole('dialog', { name: 'Configurações' })
}

async function turnOnCopy(page: Page) {
  const dialog = await openSettings(page)
  await dialog.getByRole('switch', { name: 'Copiar a dica' }).click()
  await dialog.getByRole('button', { name: 'Fechar' }).click()
}

// Abre a cruzada de hoje como visitante e preenche a primeira e a última letra da primeira palavra
// horizontal. Devolve a clique da dica na lista e o texto esperado.
async function openWithEnds(page: Page) {
  await page.goto('/')
  await page.getByRole('link', { name: /^O Globo: / }).click()
  await expect(page.getByRole('grid')).toBeVisible()
  const today = await todayPuzzle(page.request)
  const word = today.puzzle.words.find((item) => item.direction === 'across')
  if (!word) throw new Error('a cruzada de hoje deveria ter uma palavra horizontal')
  const letters = solutionLetters(today.solution, word)
  const first = letters[0] ?? ''
  const last = letters[letters.length - 1] ?? ''
  await typeWord(page, { ...word, length: 1 }, [first])
  await typeWord(page, { ...word, col: word.col + word.length - 1, length: 1 }, [last])
  const clue = page.getByRole('region', { name: 'Horizontais' }).getByRole('button').first()
  const clueText = (await clue.locator('span').first().innerText()).trim()
  const middle = '_'.repeat(word.length - 2)
  return { clue, expected: `${clueText} (${word.length}): ${first}${middle}${last}` }
}

test.describe('US1 e US2: copiar a dica', () => {
  test('ligada nos ajustes, dois cliques na dica copiam o texto e avisam', async ({ page }) => {
    await page.goto('/')
    await turnOnCopy(page)
    const { clue, expected } = await openWithEnds(page)
    await writeClipboard(page, SENTINEL)
    await clue.dblclick()
    await expect(page.getByText('Dica copiada')).toBeVisible()
    expect(await readClipboard(page)).toBe(expected)
    // A palavra continua selecionada e o texto da dica não ficou selecionado na página.
    await expect(clue).toHaveAttribute('aria-current', 'true')
    expect(await page.evaluate(() => window.getSelection()?.toString() ?? '')).toBe('')
  })

  test('dois cliques na dica da barra também copiam', async ({ page }) => {
    await page.goto('/')
    await turnOnCopy(page)
    const { expected } = await openWithEnds(page)
    await writeClipboard(page, SENTINEL)
    await page
      .locator('[aria-live="polite"][aria-atomic="true"] span')
      .filter({ hasNotText: /^$/ })
      .first()
      .dblclick()
    expect(await readClipboard(page)).toContain('(')
    expect(await readClipboard(page)).not.toBe(SENTINEL)
    expect(expected).toContain('_')
  })

  test('desligada (padrão), dois cliques não copiam nem avisam', async ({ page }) => {
    const { clue } = await openWithEnds(page)
    await writeClipboard(page, SENTINEL)
    await clue.dblclick()
    await expect(page.getByText('Dica copiada')).toHaveCount(0)
    expect(await readClipboard(page)).toBe(SENTINEL)
  })

  test('dois cliques numa célula não copiam', async ({ page }) => {
    await page.goto('/')
    await turnOnCopy(page)
    await openWithEnds(page)
    await writeClipboard(page, SENTINEL)
    await page.getByRole('gridcell').first().dblclick()
    await expect(page.getByText('Dica copiada')).toHaveCount(0)
    expect(await readClipboard(page)).toBe(SENTINEL)
  })

  test('com o jogo pausado não copia', async ({ page }) => {
    await page.goto('/')
    await turnOnCopy(page)
    const { clue } = await openWithEnds(page)
    await page.getByRole('button', { name: 'Pausar' }).click()
    await writeClipboard(page, SENTINEL)
    await clue.dblclick()
    expect(await readClipboard(page)).toBe(SENTINEL)
  })

  test('o aviso não move a barra de ferramentas nem o tabuleiro', async ({ page }) => {
    await page.goto('/')
    await turnOnCopy(page)
    const { clue } = await openWithEnds(page)
    const grid = page.getByRole('grid')
    const before = await box(grid)
    const toolbar = await box(page.locator('h1').first())
    await clue.dblclick()
    await expect(page.getByText('Dica copiada')).toBeVisible()
    const after = await box(grid)
    const toolbarAfter = await box(page.locator('h1').first())
    for (const key of ['x', 'y', 'width', 'height'] as const) {
      expectNear(after[key], before[key])
      expectNear(toolbarAfter[key], toolbar[key])
    }
  })

  for (const scheme of ['light', 'dark'] as const) {
    test(`o aviso passa no axe no tema ${scheme}`, async ({ page }) => {
      await page.emulateMedia({ colorScheme: scheme })
      await page.goto('/')
      await turnOnCopy(page)
      const { clue } = await openWithEnds(page)
      await clue.dblclick()
      await expect(page.getByText('Dica copiada')).toBeVisible()
      expect((await axe(page).analyze()).violations).toEqual([])
    })
  }

  test('a opção continua ligada depois de recarregar e "Restaurar padrões" a desliga', async ({
    page,
  }) => {
    await page.goto('/')
    await turnOnCopy(page)
    await page.reload()
    let dialog = await openSettings(page)
    await expect(dialog.getByRole('switch', { name: 'Copiar a dica' })).toHaveAttribute(
      'aria-checked',
      'true',
    )
    await dialog.getByRole('button', { name: 'Restaurar padrões' }).click()
    dialog = page.getByRole('dialog', { name: 'Configurações' })
    await expect(dialog.getByRole('switch', { name: 'Copiar a dica' })).toHaveAttribute(
      'aria-checked',
      'false',
    )
  })
})

test.describe('US3: fechar os ajustes ao clicar fora', () => {
  test('clicar fora fecha e o foco volta à engrenagem', async ({ page }) => {
    await page.goto('/')
    await openSettings(page)
    await page.mouse.click(4, 4)
    await expect(page.getByRole('dialog')).toHaveCount(0)
    await expect(page.getByRole('button', { name: 'Configurações' })).toBeFocused()
  })

  test('clicar dentro, ou arrastar de dentro para fora, não fecha', async ({ page }) => {
    await page.goto('/')
    const dialog = await openSettings(page)
    await dialog.getByRole('heading', { name: 'Configurações' }).click()
    await expect(dialog).toBeVisible()
    const heading = await box(dialog.getByRole('heading', { name: 'Configurações' }))
    await page.mouse.move(heading.x + 4, heading.y + 4)
    await page.mouse.down()
    await page.mouse.move(4, 4)
    await page.mouse.up()
    await expect(dialog).toBeVisible()
  })

  test('Esc continua fechando', async ({ page }) => {
    await page.goto('/')
    await openSettings(page)
    await page.keyboard.press('Escape')
    await expect(page.getByRole('dialog')).toHaveCount(0)
  })
})
