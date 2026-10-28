import AxeBuilder from '@axe-core/playwright'
import { expect, test } from '@playwright/test'
import { resetAndSeed } from './support'

test.beforeEach(async () => {
  await resetAndSeed()
})

async function turnOnDirectPlay(page: import('@playwright/test').Page) {
  await page.goto('/calendario')
  await page.getByRole('button', { name: 'Configurações' }).click()
  const dialog = page.getByRole('dialog', { name: 'Configurações' })
  await dialog.getByRole('switch', { name: 'Ir direto ao jogo' }).click()
  await dialog.getByRole('button', { name: 'Fechar' }).click()
}

test.describe('US1: landing em / (feature 048)', () => {
  test('a landing abre sem conta e "Jogar a cruzada de hoje" chega ao jogo em até 2 cliques', async ({
    page,
  }) => {
    await page.goto('/')
    await expect(page.getByRole('heading', { level: 1, name: 'Cruzadinha' })).toBeVisible()
    await expect(page.getByRole('heading', { level: 2, name: 'Jogue sem conta' })).toBeVisible()
    await page.getByRole('link', { name: 'Jogar a cruzada de hoje' }).click()
    await expect(page).toHaveURL(/\/jogo\//)
    await expect(page.getByRole('grid')).toBeVisible()
  })

  test('o calendário fica a um clique, pelo cabeçalho e pela faixa final', async ({ page }) => {
    await page.goto('/')
    await page.getByRole('banner').getByRole('link', { name: 'Calendário' }).click()
    await expect(page).toHaveURL(/\/calendario$/)
    await expect(page.getByRole('heading', { level: 1, name: 'Hoje' })).toBeVisible()
    await page.goto('/')
    await page.getByRole('link', { name: 'Ver o calendário' }).click()
    await expect(page).toHaveURL(/\/calendario$/)
  })

  test('com "Ir direto ao jogo" ligado, / leva ao jogo e o logo também, sem mostrar a landing', async ({
    page,
  }) => {
    await turnOnDirectPlay(page)
    // Conta quadros pintados com o texto da landing: o HTML pré-gerado chega antes do script que o
    // esvazia, mas isso acontece antes de qualquer pintura.
    await page.addInitScript(() => {
      const seen = { landing: false }
      ;(window as unknown as { landingSeen: typeof seen }).landingSeen = seen
      const look = () => {
        if (document.body?.textContent?.includes('Jogue sem conta')) seen.landing = true
        requestAnimationFrame(look)
      }
      requestAnimationFrame(look)
    })
    await page.goto('/')
    await expect(page).toHaveURL(/\/jogo\//)
    await expect(page.getByRole('grid')).toBeVisible()
    expect(
      await page.evaluate(
        () => (window as unknown as { landingSeen: { landing: boolean } }).landingSeen.landing,
      ),
    ).toBe(false)

    await page.getByRole('banner').getByRole('link', { name: 'Calendário' }).click()
    await expect(page.getByRole('heading', { level: 1, name: 'Hoje' })).toBeVisible()
    await page.getByRole('banner').getByRole('link', { name: 'Cruzadinha' }).click()
    await expect(page).toHaveURL(/\/jogo\//)
  })
})

test.describe('US3: mini cruzada (feature 048)', () => {
  test('"Experimentar aqui" leva até a mini cruzada, que se resolve sem chamar a API', async ({
    page,
  }) => {
    const apiCalls: string[] = []
    page.on('request', (request) => {
      if (new URL(request.url()).pathname.startsWith('/api/')) apiCalls.push(request.url())
    })
    await page.goto('/')
    await page.getByRole('link', { name: 'Experimentar aqui' }).click()
    const grid = page.getByRole('grid', { name: 'Mini cruzada 5 por 5' })
    await expect(grid).toBeInViewport()

    await grid.focus()
    await page.keyboard.type('AINDA')
    const cell = (row: number, col: number) => page.locator(`#mini-cruzada-${row}-${col}`)
    await cell(2, 0).click()
    await page.keyboard.type('BAILE')
    await cell(4, 0).click()
    await page.keyboard.type('MOEDA')
    // Letras das verticais pelo campo do teclado da tela, como no celular.
    const sink = page.getByLabel('Letras da mini cruzada')
    await cell(0, 0).click()
    await cell(0, 0).click()
    await sink.focus()
    await sink.pressSequentially('ALBUM')
    await cell(0, 4).click()
    await sink.focus()
    await sink.pressSequentially('AREIA')
    await cell(0, 2).click()
    await sink.focus()
    await sink.pressSequentially('NOITE')
    await expect(page.getByText('Você completou a mini cruzada!')).toBeVisible()
    expect(apiCalls).toEqual([])
  })

  test('com movimento reduzido a rolagem até a mini cruzada é direta', async ({ page }) => {
    await page.emulateMedia({ reducedMotion: 'reduce' })
    await page.goto('/')
    expect(
      await page.evaluate(() => getComputedStyle(document.documentElement).scrollBehavior),
    ).toBe('auto')
    await page.getByRole('link', { name: 'Experimentar aqui' }).click()
    await expect(page.getByRole('grid', { name: 'Mini cruzada 5 por 5' })).toBeInViewport()
  })
})

test.describe('US5: aparência e conforto (feature 048)', () => {
  for (const theme of ['light', 'dark'] as const) {
    test(`360 px sem rolagem horizontal e axe sem violações, tema ${theme}`, async ({ page }) => {
      await page.emulateMedia({ colorScheme: theme })
      await page.setViewportSize({ width: 360, height: 740 })
      await page.goto('/')
      await expect(page.getByRole('heading', { level: 1, name: 'Cruzadinha' })).toBeVisible()
      const overflow = await page.evaluate(() => ({
        scroll: document.documentElement.scrollWidth,
        client: document.documentElement.clientWidth,
      }))
      expect(overflow.scroll).toBeLessThanOrEqual(overflow.client)
      // O contraste dos estados do tabuleiro é uma exceção assumida (feature 010, FR-026).
      const results = await new AxeBuilder({ page }).exclude('[role="grid"]').analyze()
      expect(results.violations).toEqual([])
    })
  }

  test('com movimento reduzido o título aparece pronto, sem animação rodando', async ({ page }) => {
    await page.emulateMedia({ reducedMotion: 'reduce' })
    await page.goto('/')
    await expect(page.getByRole('heading', { level: 1, name: 'Cruzadinha' })).toBeVisible()
    const running = await page.evaluate(
      () =>
        document
          .getAnimations()
          .filter((animation) => animation.playState === 'running' && animation.pending === false)
          .filter((animation) => (animation.effect?.getComputedTiming().duration as number) > 1)
          .length,
    )
    expect(running).toBe(0)
  })

  test('as animações não deslocam o layout', async ({ page }) => {
    await page.addInitScript(() => {
      const state = { shift: 0 }
      ;(window as unknown as { layoutShift: typeof state }).layoutShift = state
      new PerformanceObserver((list) => {
        for (const entry of list.getEntries()) {
          const shift = entry as PerformanceEntry & { value: number; hadRecentInput: boolean }
          if (!shift.hadRecentInput) state.shift += shift.value
        }
      }).observe({ type: 'layout-shift', buffered: true })
    })
    await page.goto('/')
    await expect(page.getByRole('heading', { level: 1, name: 'Cruzadinha' })).toBeVisible()
    // Espera a animação do título (10 casas, 70 ms entre elas, 520 ms cada) e a troca da fonte.
    await page.waitForTimeout(1_800)
    const shift = await page.evaluate(
      () => (window as unknown as { layoutShift: { shift: number } }).layoutShift.shift,
    )
    expect(shift).toBeLessThan(0.01)
    const box = await page.getByRole('main').boundingBox()
    await page.waitForTimeout(500)
    expect(await page.getByRole('main').boundingBox()).toEqual(box)
  })
})

test('a landing abre sem rede depois de o site ser instalado (FR-014)', async ({
  page,
  context,
}) => {
  // O service worker só passa a controlar a página na abertura seguinte (feature 041).
  await page.goto('/')
  await page.evaluate(() => navigator.serviceWorker.ready.then(() => undefined))
  await page.reload()
  await expect
    .poll(() => page.evaluate(() => navigator.serviceWorker.controller !== null))
    .toBe(true)
  await context.setOffline(true)
  await page.reload()
  await expect(page.getByRole('heading', { level: 1, name: 'Cruzadinha' })).toBeVisible()
  await expect(page.getByRole('link', { name: 'Jogar a cruzada de hoje' })).toBeVisible()
})
