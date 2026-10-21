import { expect, test, type Page } from '@playwright/test'
import { login, resetAndSeed } from './support'

// Feature 011: medidas reais do layout de computador, das alças e do celular.
// A cruzada de amostra do seed é 5 × 5; as medidas de referência do celular e da biblioteca foram
// tiradas da feature 010 (main) antes da mudança.
const BASELINE_PHONE = { cell: 64, grid: 328, calendar: 328, dayHeight: 56 }
const BASELINE_DESKTOP_CALENDAR = 1008
// Tamanho do tabuleiro e largura do calendário ficam nas configurações (feature 021).
const SETTINGS_KEY = 'cruzadinha:settings'
type SizeField = 'boardCellSize' | 'libraryWidth'

function storedSize(page: Page, field: SizeField): Promise<unknown> {
  return page.evaluate(
    ([key, name]) => {
      const raw = localStorage.getItem(key)
      const record = raw ? (JSON.parse(raw) as { settings?: Record<string, unknown> }) : null
      return record?.settings?.[name] ?? null
    },
    [SETTINGS_KEY, field] as const,
  )
}

function storeSize(page: Page, field: SizeField, value: number): Promise<void> {
  return page.evaluate(
    ([key, name, size]) => {
      const raw = localStorage.getItem(key)
      const record = raw
        ? (JSON.parse(raw) as { v: number; settings: Record<string, unknown>; savedAt: string })
        : { v: 1, settings: {}, savedAt: new Date(0).toISOString() }
      record.settings[name] = size
      record.savedAt = new Date().toISOString()
      localStorage.setItem(key, JSON.stringify(record))
    },
    [SETTINGS_KEY, field, value] as const,
  )
}

test.beforeEach(async () => {
  await resetAndSeed()
})

async function openToday(page: Page) {
  await login(page)
  await page.getByRole('link', { name: /^O Globo: / }).click()
  await expect(page.getByRole('grid')).toBeVisible()
}

async function cellWidth(page: Page): Promise<number> {
  const box = await page.getByRole('gridcell').first().boundingBox()
  return box?.width ?? 0
}

async function noHorizontalScroll(page: Page) {
  const { scroll, client } = await page.evaluate(() => ({
    scroll: document.documentElement.scrollWidth,
    client: document.documentElement.clientWidth,
  }))
  expect(scroll).toBeLessThanOrEqual(client)
}

// Arrasta do centro do elemento, em passos, como uma pessoa faria.
async function drag(page: Page, selector: ReturnType<Page['getByRole']>, dx: number, dy: number) {
  const box = await selector.boundingBox()
  if (!box) throw new Error('alça invisível')
  const x = box.x + box.width / 2
  const y = box.y + box.height / 2
  await page.mouse.move(x, y)
  await page.mouse.down()
  await page.mouse.move(x + dx, y + dy, { steps: 12 })
  await page.mouse.up()
}

test.describe('layout do jogo no computador', () => {
  test.use({ viewport: { width: 1920, height: 1080 } })

  test('bloco centralizado, dicas estreitas e tabuleiro inteiro sem rolar', async ({ page }) => {
    await openToday(page)
    const grid = await page.getByRole('grid').boundingBox()
    const aside = await page.getByRole('complementary', { name: 'Dicas' }).boundingBox()
    const board = await page.getByRole('region', { name: 'Tabuleiro' }).boundingBox()
    if (!grid || !aside || !board) throw new Error('layout sem medida')
    expect(await page.evaluate(() => window.scrollY)).toBe(0)
    expect(grid.y + grid.height).toBeLessThanOrEqual(1080)
    expect(aside.width).toBeLessThanOrEqual(576)
    const left = board.x
    const right = 1920 - (aside.x + aside.width)
    expect(Math.abs(left - right)).toBeLessThanOrEqual(2)
    expect(await cellWidth(page)).toBeGreaterThanOrEqual(72)
  })

  test('"Próxima dica" troca a dica sem rolar a página', async ({ page }) => {
    await openToday(page)
    const board = page.getByRole('region', { name: 'Tabuleiro' })
    const live = board.locator('[aria-live="polite"]').first()
    const before = await live.textContent()
    await page.getByRole('button', { name: 'Próxima dica' }).click()
    await expect(live).not.toHaveText(before ?? '')
    expect(await page.evaluate(() => window.scrollY)).toBe(0)
  })
})

test.describe('alça do tabuleiro', () => {
  test.use({ viewport: { width: 1920, height: 1080 } })

  test('arrastar muda, guarda e respeita os limites; "Tamanho padrão" apaga', async ({ page }) => {
    await openToday(page)
    const handle = page.getByRole('slider', { name: 'Tamanho do tabuleiro' })
    const start = await cellWidth(page)

    // Para menor, além do limite: para em 30 px.
    await drag(page, handle, -2000, 0)
    await expect.poll(() => cellWidth(page)).toBeCloseTo(30, 0)

    // Para maior, além do limite: para no máximo (110 px ou o que couber).
    await drag(page, handle, 2000, 2000)
    const max = Number(await handle.getAttribute('aria-valuemax'))
    await expect.poll(() => cellWidth(page)).toBeCloseTo(max, 0)
    expect(max).toBeLessThanOrEqual(110)

    // Depois de arrastar, as letras vão para o tabuleiro.
    await expect(page.getByRole('grid')).toBeFocused()

    await page.reload()
    await expect(page.getByRole('grid')).toBeVisible()
    expect(Math.abs((await cellWidth(page)) - max)).toBeLessThanOrEqual(1)

    await page.getByRole('button', { name: 'Tamanho padrão' }).click()
    expect(await storedSize(page, 'boardCellSize')).toBeNull()
    await expect.poll(() => cellWidth(page)).toBeCloseTo(start, 0)
    await expect(page.getByRole('button', { name: 'Tamanho padrão' })).toBeDisabled()
  })

  test('só com o teclado', async ({ page }) => {
    await openToday(page)
    const handle = page.getByRole('slider', { name: 'Tamanho do tabuleiro' })
    await handle.focus()
    await page.keyboard.press('Home')
    await expect(handle).toHaveAttribute('aria-valuenow', '30')
    await page.keyboard.press('ArrowRight')
    await expect(handle).toHaveAttribute('aria-valuenow', '40')
    await expect(handle).toHaveAttribute('aria-valuetext', /^Tamanho do tabuleiro 40 de \d+$/)
    expect(await storedSize(page, 'boardCellSize')).toBe(40)
  })

  test('do tabuleiro, Tab fica nas palavras e Esc + Tab chega à alça', async ({ page }) => {
    await openToday(page)
    const grid = page.getByRole('grid')
    await expect(grid).toBeFocused()
    await page.keyboard.press('Shift+Tab')
    await page.keyboard.press('Tab')
    await expect(grid).toBeFocused()
    await page.keyboard.press('Escape')
    await page.keyboard.press('Tab')
    await expect(page.getByRole('slider', { name: 'Tamanho do tabuleiro' })).toBeFocused()
  })

  test('a escolha não muda quando não cabe e volta ao alargar', async ({ page }) => {
    await openToday(page)
    await storeSize(page, 'boardCellSize', 110)
    await page.reload()
    await expect(page.getByRole('grid')).toBeVisible()
    await page.setViewportSize({ width: 900, height: 1080 })
    await noHorizontalScroll(page)
    expect(await storedSize(page, 'boardCellSize')).toBe(110)
    await page.setViewportSize({ width: 1920, height: 1080 })
    await expect.poll(() => cellWidth(page)).toBeCloseTo(110, 0)
  })

  test('sem rolagem horizontal de 861 a 2560 px, com 30 e 110 px', async ({ page }) => {
    await openToday(page)
    for (const cellSize of [30, 110]) {
      await storeSize(page, 'boardCellSize', cellSize)
      for (const width of [861, 2560]) {
        await page.setViewportSize({ width, height: 1080 })
        await page.reload()
        await expect(page.getByRole('grid')).toBeVisible()
        await noHorizontalScroll(page)
      }
    }
  })

  test('valor guardado inválido abre no padrão, sem erro', async ({ page }) => {
    await openToday(page)
    const start = await cellWidth(page)
    await storeSize(page, 'boardCellSize', 999)
    await page.reload()
    await expect(page.getByRole('grid')).toBeVisible()
    expect(Math.abs((await cellWidth(page)) - start)).toBeLessThanOrEqual(1)
  })
})

test.describe('biblioteca no computador', () => {
  test.use({ viewport: { width: 1920, height: 1080 } })

  const calendar = (page: Page) => page.locator('#source-panel')
  const calendarWidth = async (page: Page) => (await calendar(page).boundingBox())?.width ?? 0

  test('ajuste automático: bem mais largo e o mês cabe sem rolar', async ({ page }) => {
    await login(page)
    const width = await calendarWidth(page)
    expect(width).toBeGreaterThanOrEqual(1.5 * BASELINE_DESKTOP_CALENDAR)
    expect(width).toBeLessThanOrEqual(1600)
    const lastRow = await calendar(page).locator('tbody tr').last().boundingBox()
    expect(await page.evaluate(() => window.scrollY)).toBe(0)
    expect((lastRow?.y ?? 0) + (lastRow?.height ?? 0)).toBeLessThanOrEqual(1080)
  })

  test('um mês de seis semanas cabe inteiro sem rolar', async ({ page }) => {
    await login(page)
    const rows = calendar(page).locator('tbody tr')
    const previous = page.getByRole('button', { name: 'Mês anterior' })
    for (let step = 0; step < 12 && (await rows.count()) < 6; step += 1) {
      if (await previous.isDisabled()) break
      await previous.click()
    }
    test.skip((await rows.count()) < 6, 'nenhum mês navegável tem seis semanas')
    const last = await rows.last().boundingBox()
    expect(await page.evaluate(() => window.scrollY)).toBe(0)
    expect((last?.y ?? 0) + (last?.height ?? 0)).toBeLessThanOrEqual(1080)
  })

  test('arrastar a borda até o mínimo guarda 720 px; clique duplo volta', async ({ page }) => {
    await login(page)
    const handle = page.getByRole('slider', { name: 'Largura do calendário' })
    const auto = await calendarWidth(page)
    await drag(page, handle, -2000, 0)
    await expect.poll(() => calendarWidth(page)).toBeCloseTo(720, 0)
    // O título acompanha a mesma coluna.
    const title = await page.getByRole('heading', { level: 1, name: 'Hoje' }).boundingBox()
    const box = await calendar(page).boundingBox()
    expect(title?.x ?? 0).toBeGreaterThanOrEqual((box?.x ?? 0) - 1)

    // No mínimo, o texto de cada dia aparece inteiro.
    const clipped = await calendar(page)
      .locator('small')
      .evaluateAll((items) => items.filter((item) => item.scrollWidth > item.clientWidth).length)
    expect(clipped).toBe(0)

    await page.reload()
    await expect(calendar(page)).toBeVisible()
    expect(Math.abs((await calendarWidth(page)) - 720)).toBeLessThanOrEqual(1)

    await drag(page, handle, 2000, 0)
    expect(await calendarWidth(page)).toBeLessThanOrEqual(1600)

    await handle.dblclick()
    expect(await storedSize(page, 'libraryWidth')).toBeNull()
    await expect.poll(() => calendarWidth(page)).toBeCloseTo(auto, 0)
  })

  test('a pegada de canto também arrasta; o teclado funciona na alça', async ({ page }) => {
    await login(page)
    const corner = calendar(page).locator('[aria-hidden="true"][tabindex="-1"]').last()
    await drag(page, corner, -300, -10)
    const afterCorner = await calendarWidth(page)
    expect(afterCorner).toBeLessThan(1600)
    const handle = page.getByRole('slider', { name: 'Largura do calendário' })
    await handle.focus()
    await page.keyboard.press('End')
    await expect(handle).toHaveAttribute('aria-valuenow', '1600')
    await page.keyboard.press('ArrowLeft')
    await expect(handle).toHaveAttribute('aria-valuenow', '1560')
    await page.keyboard.press('Home')
    await expect(handle).toHaveAttribute('aria-valuenow', '720')
  })

  test('a largura guardada não muda quando não cabe e volta ao alargar', async ({ page }) => {
    await login(page)
    await storeSize(page, 'libraryWidth', 1600)
    await page.reload()
    await expect(calendar(page)).toBeVisible()
    await page.setViewportSize({ width: 900, height: 1080 })
    await noHorizontalScroll(page)
    expect(await storedSize(page, 'libraryWidth')).toBe(1600)
    await page.setViewportSize({ width: 861, height: 1080 })
    await noHorizontalScroll(page)
    await page.setViewportSize({ width: 1920, height: 1080 })
    await expect.poll(() => calendarWidth(page)).toBeCloseTo(1600, 0)
  })
})

test.describe('celular', () => {
  test.use({ viewport: { width: 360, height: 740 }, hasTouch: true, isMobile: true })

  test('biblioteca e jogo ficam como na feature 010, sem alças', async ({ page }) => {
    await login(page)
    const cal = await page.locator('#source-panel').boundingBox()
    expect(cal?.width).toBeCloseTo(BASELINE_PHONE.calendar, 0)
    const day = await page.locator('td a, td div').first().boundingBox()
    expect(day?.height).toBeCloseTo(BASELINE_PHONE.dayHeight, 0)
    await expect(page.getByRole('slider')).toHaveCount(0)

    await page.getByRole('link', { name: /^O Globo: / }).click()
    const grid = await page.getByRole('grid').boundingBox()
    expect(grid?.width).toBeCloseTo(BASELINE_PHONE.grid, 0)
    expect(grid?.height).toBeCloseTo(BASELINE_PHONE.grid, 0)
    expect(await cellWidth(page)).toBeCloseTo(BASELINE_PHONE.cell, 0)
    await expect(page.getByRole('slider')).toHaveCount(0)
    await expect(page.getByRole('button', { name: 'Próxima dica' })).toHaveCount(0)
    await noHorizontalScroll(page)
  })
})
