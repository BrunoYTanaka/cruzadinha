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
    await expect(
      page.getByRole('heading', { level: 1, name: /Palavras cruzadas todo dia/ }),
    ).toBeVisible()
    await expect(
      page.getByRole('heading', { level: 2, name: 'Abriu, jogou. O resto é opcional.' }),
    ).toBeVisible()
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
        if (document.body?.textContent?.includes('Abriu, jogou. O resto é opcional.'))
          seen.landing = true
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

    const status = page.getByRole('status').filter({ hasText: 'palavras certas' })
    await expect(status).toHaveText('0 de 6 palavras certas.')
    const storageBefore = await page.evaluate(() => Object.keys(localStorage))
    // Cada palavra: escolhe a dica, vai ao começo (Home) e digita. As três primeiras letras de COSTA
    // já vêm preenchidas e são redigitadas por cima.
    const fill = async (clue: RegExp, letters: string) => {
      await page.getByRole('button', { name: clue }).click()
      await page.keyboard.press('Home')
      await page.keyboard.type(letters)
    }
    await fill(/Faixa de terra junto ao mar/, 'COSTA')
    await expect(status).toHaveText('1 de 6 palavras certas.')
    await fill(/O planeta Terra/, 'MUNDO')
    await fill(/Pôr do sol/, 'OCASO')
    await fill(/Terreno de futebol/, 'CAMPO')
    // Letras das últimas palavras pelo campo do teclado da tela, como no celular.
    const sink = page.getByLabel('Letras da mini cruzada')
    await page.getByRole('button', { name: /Aparelho que mede/ }).click()
    await page.keyboard.press('Home')
    await sink.focus()
    await sink.pressSequentially('SONDA')
    await fill(/Partícula de matéria/, 'ATOMO')
    await expect(page.getByText('Resolvida! Amanhã tem outra.')).toBeVisible()
    expect(await page.evaluate(() => Object.keys(localStorage))).toEqual(storageBefore)
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
      await expect(
        page.getByRole('heading', { level: 1, name: /Palavras cruzadas todo dia/ }),
      ).toBeVisible()
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
    await expect(
      page.getByRole('heading', { level: 1, name: /Palavras cruzadas todo dia/ }),
    ).toBeVisible()
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
    await expect(
      page.getByRole('heading', { level: 1, name: /Palavras cruzadas todo dia/ }),
    ).toBeVisible()
    // Espera a animação do título (10 casas, 70 ms entre elas, queda e clarão) e a troca da fonte.
    await page.waitForTimeout(3_000)
    const shift = await page.evaluate(
      () => (window as unknown as { layoutShift: { shift: number } }).layoutShift.shift,
    )
    expect(shift).toBeLessThan(0.01)
    const box = await page.getByRole('main').boundingBox()
    const heading = await page.getByRole('heading', { level: 1 }).boundingBox()
    const action = await page.getByRole('link', { name: 'Jogar a cruzada de hoje' }).boundingBox()
    await page.waitForTimeout(500)
    expect(await page.getByRole('main').boundingBox()).toEqual(box)
    expect(await page.getByRole('heading', { level: 1 }).boundingBox()).toEqual(heading)
    expect(await page.getByRole('link', { name: 'Jogar a cruzada de hoje' }).boundingBox()).toEqual(
      action,
    )
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
  await expect(
    page.getByRole('heading', { level: 1, name: /Palavras cruzadas todo dia/ }),
  ).toBeVisible()
  await expect(page.getByRole('link', { name: 'Jogar a cruzada de hoje' })).toBeVisible()
})

test.describe('US4/US5: sem terceiros, letras e teclado (feature 049)', () => {
  test('nenhuma requisição sai do site ao abrir a landing e usar a mini cruzada', async ({
    page,
    baseURL,
  }) => {
    const host = new URL(baseURL ?? 'http://localhost').hostname
    const foreign: string[] = []
    page.on('request', (request) => {
      const url = new URL(request.url())
      if (url.protocol.startsWith('http') && url.hostname !== host) foreign.push(request.url())
    })
    await page.goto('/')
    await page.getByRole('link', { name: 'Experimentar aqui' }).click()
    await page.getByRole('grid', { name: 'Mini cruzada 5 por 5' }).focus()
    await page.keyboard.type('TA')
    expect(foreign).toEqual([])
  })

  test('títulos em Fraunces, rótulos em Roboto Mono e texto em Roboto', async ({ page }) => {
    await page.goto('/')
    const family = (selector: string) =>
      page
        .locator(selector)
        .first()
        .evaluate((el) => getComputedStyle(el).fontFamily)
    expect(await family('#fontes-titulo')).toContain('Fraunces')
    expect(await family('#como p')).toContain('Roboto Mono')
    expect(await family('#como article p')).toContain('Roboto')
  })

  test('Tab chega a todo controle com foco visível e sai da grade pela última palavra', async ({
    page,
  }) => {
    await page.goto('/')
    const outlines = new Set<string>()
    for (let i = 0; i < 40; i += 1) {
      await page.keyboard.press('Tab')
      const info = await page.evaluate(() => {
        const el = document.activeElement
        if (!el || el === document.body) return null
        const style = getComputedStyle(el)
        return { visible: style.outlineStyle !== 'none' || style.boxShadow !== 'none' }
      })
      if (info) outlines.add(String(info.visible))
    }
    expect(outlines.has('true')).toBe(true)

    await page.getByRole('link', { name: 'Experimentar aqui' }).click()
    await page.getByRole('button', { name: /Partícula de matéria/ }).click()
    await page.keyboard.press('Tab')
    // Última palavra: o foco saiu da grade em vez de voltar para a primeira.
    expect(await page.evaluate(() => document.activeElement?.getAttribute('role') === 'grid')).toBe(
      false,
    )
  })
})
