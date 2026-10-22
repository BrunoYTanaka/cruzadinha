import AxeBuilder from '@axe-core/playwright'
import { expect, test, type Locator, type Page } from '@playwright/test'
import {
  box,
  brasiliaToday,
  css,
  expectNear,
  fillSolution,
  login,
  pressLetter,
  probe,
  resetAndSeed,
  todaySolution,
  typedLetter,
} from './support'

test.beforeEach(async () => {
  await resetAndSeed()
})

const THEMES = ['light', 'dark'] as const

// Cor calculada de um token do tema, para comparar sem escrever a cor no teste.
function tokenColor(page: Page, name: string) {
  return probe(page, 'color', `var(${name})`)
}

function tokenBackground(page: Page, name: string) {
  return probe(page, 'background-color', `var(${name})`)
}

async function openSettings(page: Page) {
  await page.getByRole('button', { name: 'Configurações' }).click()
  return page.getByRole('dialog', { name: 'Configurações' })
}

async function openToday(page: Page) {
  await page.goto('/')
  await page.getByRole('link', { name: /^O Globo: / }).click()
  await expect(page.getByRole('grid')).toBeVisible()
}

// Contorno de 1 px com a cor de `--control-line` (secundário e discreto, SC-001).
async function expectControlBorder(page: Page, locator: Locator) {
  await expect(locator).toBeVisible()
  expect(await css(locator, 'border-top-style')).toBe('solid')
  expect(await css(locator, 'border-top-width')).toBe('1px')
  expect(await css(locator, 'border-top-color')).toBe(await tokenColor(page, '--control-line'))
}

// Botões e links visíveis com o fundo do principal dentro de um formulário ou modal (FR-002).
async function primaryCount(page: Page, container: Locator) {
  const accent = await tokenBackground(page, '--accent')
  return container
    .locator('button:visible, a:visible')
    .evaluateAll(
      (elements, color) =>
        elements.filter((element) => getComputedStyle(element).backgroundColor === color).length,
      accent,
    )
}

test.describe('023 US1: botões reconhecíveis à primeira vista', () => {
  for (const theme of THEMES) {
    test(`contorno visível nos botões de texto, tema ${theme}`, async ({ page }) => {
      await page.emulateMedia({ colorScheme: theme })

      // Biblioteca: ‹ e › do calendário são secundários.
      await page.goto('/')
      for (const name of ['Mês anterior', 'Próximo mês']) {
        const nav = page.getByRole('button', { name })
        await expectControlBorder(page, nav)
        expect(await css(nav, 'background-color')).toBe(await tokenBackground(page, '--control'))
      }

      // Configurações: "Restaurar padrões", − e + e o botão de tema.
      const dialog = await openSettings(page)
      await expectControlBorder(page, dialog.getByRole('button', { name: 'Restaurar padrões' }))
      await expectControlBorder(page, dialog.getByRole('button', { name: 'Menos letras' }))
      await expectControlBorder(page, dialog.getByRole('button', { name: 'Mais letras' }))
      await expectControlBorder(page, dialog.getByRole('button', { name: /^Tema:/ }))
      await dialog.getByRole('button', { name: 'Fechar' }).click()

      // Jogo: as três ajudas.
      await openToday(page)
      await expectControlBorder(page, page.getByRole('button', { name: /^Revelar letra/ }))
      await expectControlBorder(page, page.getByRole('button', { name: /^Revelar palavra/ }))
      await expectControlBorder(page, page.getByRole('button', { name: 'Verificar' }))

      // Cabeçalho com conta: "Sair".
      await login(page)
      await expectControlBorder(page, page.getByRole('button', { name: 'Sair' }))
    })
  }

  test('no máximo um botão principal por formulário ou modal', async ({ page }) => {
    await page.goto('/login')
    expect(await primaryCount(page, page.locator('form'))).toBe(1)

    await page.goto('/cadastro')
    expect(await primaryCount(page, page.locator('form'))).toBe(1)

    // Modal de conclusão, como visitante.
    await openToday(page)
    await fillSolution(page, await todaySolution(page.request))
    const done = page.getByRole('dialog', { name: 'Cruzada concluída' })
    await expect(done).toBeVisible()
    expect(await primaryCount(page, done)).toBeLessThanOrEqual(1)

    // Modal de nova entrada, como em ajudas-e-retomada.spec.ts: a sessão some no meio do jogo.
    await resetAndSeed()
    await page.context().clearCookies()
    await login(page)
    await openToday(page)
    await page.context().clearCookies()
    await page.getByRole('gridcell', { name: /vazia/ }).first().click()
    await pressLetter(page, typedLetter('X'))
    await expect(page.getByText(/Sua sessão expirou/)).toBeVisible({ timeout: 15_000 })
    await page.getByRole('button', { name: 'Entrar de novo' }).click()
    const relogin = page.getByRole('dialog')
    await expect(relogin).toBeVisible()
    expect(await primaryCount(page, relogin)).toBe(1)
  })
})

const backgroundImage = (locator: Locator) => css(locator, 'background-image')

type Box = { x: number; y: number; width: number; height: number }

function expectSameBox(a: Box, b: Box) {
  expectNear(a.x, b.x)
  expectNear(a.y, b.y)
  expectNear(a.width, b.width)
  expectNear(a.height, b.height)
}

// O elemento seguinte (ou o anterior) no mesmo pai, para conferir que o vizinho também não se move.
async function neighbourOf(locator: Locator) {
  const next = locator.locator('xpath=following-sibling::*[1]')
  if ((await next.count()) > 0 && (await next.isVisible())) return next
  const previous = locator.locator('xpath=preceding-sibling::*[1]')
  if ((await previous.count()) > 0 && (await previous.isVisible())) return previous
  return null
}

// Repouso, mouse por cima, foco pelo teclado e pressionado (FR-007, FR-010, FR-012). Termina com
// o clique (`mouse.up` sobre o botão), por isso a ordem das amostras importa.
async function expectStates(page: Page, button: Locator) {
  await expect(button).toBeVisible()
  // O `hover()` rola o botão até a vista (a modal de configurações é mais alta que a janela): a
  // caixa de repouso é medida depois dessa rolagem.
  await button.scrollIntoViewIfNeeded()
  await page.mouse.move(0, 0)
  const neighbour = await neighbourOf(button)
  const rest = { self: await box(button), other: neighbour ? await box(neighbour) : null }
  const sameAsRest = async () => {
    expectSameBox(await box(button), rest.self)
    if (neighbour && rest.other) expectSameBox(await box(neighbour), rest.other)
  }
  await expect.poll(() => backgroundImage(button)).toBe('none')

  await button.hover()
  await expect.poll(() => backgroundImage(button)).not.toBe('none')
  const hover = await backgroundImage(button)
  await sameAsRest()

  // Uma tecla põe o navegador no modo de teclado e o foco seguinte mostra o contorno. Shift não move
  // o foco, que o Tab levaria a outro elemento.
  await page.keyboard.press('Shift')
  await button.focus()
  expect(await button.evaluate((element) => element.matches(':focus-visible'))).toBe(true)
  expect(await css(button, 'outline-style')).toBe('solid')
  expect(await css(button, 'outline-width')).toBe('3px')
  await sameAsRest()

  await button.hover()
  await page.mouse.down()
  await expect.poll(() => backgroundImage(button)).not.toBe('none')
  expect(await backgroundImage(button)).not.toBe(hover)
  await sameAsRest()
  await page.mouse.up()
}

// Desativado (`disabled` ou `aria-disabled`): nada muda com o mouse nem ao pressionar (FR-011).
async function expectInert(page: Page, button: Locator) {
  await expect(button).toBeVisible()
  await button.hover({ force: true })
  expect(await backgroundImage(button)).toBe('none')
  expect(await css(button, 'cursor')).toBe('not-allowed')
  await page.mouse.down()
  expect(await backgroundImage(button)).toBe('none')
  await page.mouse.up()
}

async function setLetterLimitToZero(page: Page) {
  const dialog = await openSettings(page)
  const fewer = dialog.getByRole('button', { name: 'Menos letras' })
  while (await fewer.isEnabled()) await fewer.click()
  return dialog
}

test.describe('023 US2: resposta ao mouse, ao pressionar e ao teclado', () => {
  for (const theme of THEMES) {
    test(`estados nas telas, tema ${theme}`, async ({ page }) => {
      await page.emulateMedia({ colorScheme: theme })

      await page.goto('/login')
      await expectStates(page, page.locator('form').getByRole('button', { name: 'Entrar' }))

      await page.goto('/')
      for (const name of ['Mês anterior', 'Próximo mês']) {
        const nav = page.getByRole('button', { name })
        if (await nav.isEnabled()) await expectStates(page, nav)
        else await expectInert(page, nav)
      }

      // Engrenagem: o clique do fim abre a modal.
      await expectStates(page, page.getByRole('button', { name: 'Configurações' }))
      const dialog = page.getByRole('dialog', { name: 'Configurações' })
      await expectStates(page, dialog.getByRole('button', { name: 'Restaurar padrões' }))
      await expectStates(page, dialog.getByRole('button', { name: 'Fechar' }))
      await expect(dialog).toHaveCount(0)

      // Jogo no computador: setas da dica, ajuda e pausa. O "Tamanho padrão" fica na US3, que o
      // transforma em botão com tipo.
      await openToday(page)
      await expectStates(page, page.getByRole('button', { name: 'Próxima dica' }))
      await expectStates(page, page.getByRole('button', { name: 'Dica anterior' }))
      await expectStates(page, page.getByRole('button', { name: /^Revelar letra/ }))
      await expectStates(page, page.getByRole('button', { name: 'Pausar' }))
    })
  }

  test('desativados não reagem: −, "Tamanho padrão" no padrão e ajuda esgotada', async ({
    page,
  }) => {
    await page.goto('/')
    const dialog = await setLetterLimitToZero(page)
    await expectInert(page, dialog.getByRole('button', { name: 'Menos letras' }))
    await dialog.getByRole('button', { name: 'Fechar' }).click()

    await openToday(page)
    await expectInert(page, page.getByRole('button', { name: 'Tamanho padrão' }))
    await expectInert(page, page.getByRole('button', { name: /^Revelar letra/ }))
  })

  test('no toque, o fundo de mouse não fica preso depois de tocar', async ({
    browser,
    baseURL,
  }) => {
    const context = await browser.newContext({
      baseURL,
      hasTouch: true,
      viewport: { width: 390, height: 844 },
    })
    const page = await context.newPage()
    await page.goto('/')
    const gear = page.getByRole('button', { name: 'Configurações' })
    await gear.tap()
    await page
      .getByRole('dialog', { name: 'Configurações' })
      .getByRole('button', { name: 'Fechar' })
      .tap()
    expect(await backgroundImage(gear)).toBe('none')

    await page.getByRole('link', { name: /^O Globo: / }).tap()
    const letter = page.getByRole('button', { name: /^Revelar letra/ })
    await letter.tap()
    expect(await backgroundImage(letter)).toBe('none')
    await context.close()
  })

  test('com menos movimento, os estados trocam sem transição', async ({ page }) => {
    await page.emulateMedia({ reducedMotion: 'reduce' })
    await page.goto('/')
    const durations = (
      await css(page.getByRole('button', { name: 'Mês anterior' }), 'transition-duration')
    )
      .split(',')
      .map((value) => parseFloat(value) * (value.trim().endsWith('ms') ? 1 : 1000))
    for (const ms of durations) expect(ms).toBeLessThanOrEqual(0.01)
  })

  test('o tooltip da engrenagem aparece por cima do fundo de mouse', async ({ page }) => {
    await page.goto('/')
    await page.getByRole('button', { name: 'Configurações' }).hover()
    const tip = page.locator('[data-tooltip]', { hasText: 'Configurações' })
    await expect(tip).toBeVisible()
    // O tooltip não recebe o mouse (`pointer-events: none`), e o `elementFromPoint` o ignoraria:
    // durante a medida ele volta a receber.
    const onTop = await tip.evaluate((element) => {
      if (!(element instanceof HTMLElement)) return false
      const { left, top, width, height } = element.getBoundingClientRect()
      element.style.pointerEvents = 'auto'
      const hit = document.elementFromPoint(left + width / 2, top + height / 2)
      element.style.pointerEvents = ''
      return hit !== null && element.contains(hit)
    })
    expect(onTop).toBe(true)
  })
})

// Todo botão visível: sem sublinhado e, fora o principal, sem a cor dos links (FR-015).
async function expectButtonsAreNotLinks(page: Page) {
  const accentText = await tokenColor(page, '--accent')
  const accentBackground = await tokenBackground(page, '--accent')
  const buttons = await page.locator('button:visible').evaluateAll((elements) =>
    elements.map((element) => {
      const style = getComputedStyle(element)
      return {
        name: element.getAttribute('aria-label') ?? element.textContent ?? '',
        line: style.textDecorationLine,
        color: style.color,
        background: style.backgroundColor,
      }
    }),
  )
  expect(buttons.length).toBeGreaterThan(0)
  for (const button of buttons) {
    // Sem sublinhado; a dica resolvida é riscada de propósito (feature 019).
    expect(button.line, button.name).not.toContain('underline')
    if (button.background !== accentBackground)
      expect(button.color, button.name).not.toBe(accentText)
  }
}

// Link de texto: sublinhado, sem fundo; com o mouse, o sublinhado engrossa (FR-014).
async function expectTextLink(page: Page, link: Locator) {
  await expect(link).toBeVisible()
  await page.mouse.move(0, 0)
  expect(await css(link, 'text-decoration-line')).toBe('underline')
  expect(await backgroundImage(link)).toBe('none')
  const rest = parseFloat(await css(link, 'text-decoration-thickness')) || 1
  await link.hover()
  await expect
    .poll(async () => parseFloat(await css(link, 'text-decoration-thickness')))
    .toBeGreaterThan(rest)
  expect(await backgroundImage(link)).toBe('none')
}

function yesterday() {
  const date = new Date(`${brasiliaToday()}T12:00:00Z`)
  date.setUTCDate(date.getUTCDate() - 1)
  return date.toISOString().slice(0, 10)
}

test.describe('023 US3: link e botão distinguíveis', () => {
  test('links de texto sublinhados e botões sem cara de link, em todas as telas', async ({
    page,
  }) => {
    await page.goto('/login')
    await expectTextLink(page, page.getByRole('link', { name: 'Criar conta' }))
    await expectTextLink(page, page.getByRole('link', { name: 'Jogar sem entrar' }))
    await expectButtonsAreNotLinks(page)

    await page.goto('/cadastro')
    await expectButtonsAreNotLinks(page)

    await page.goto('/')
    await expectButtonsAreNotLinks(page)
    const dialog = await openSettings(page)
    await expect(dialog).toBeVisible()
    await expectButtonsAreNotLinks(page)
    await dialog.getByRole('button', { name: 'Fechar' }).click()

    await openToday(page)
    await expectButtonsAreNotLinks(page)
    await fillSolution(page, await todaySolution(page.request))
    await expect(page.getByRole('dialog', { name: 'Cruzada concluída' })).toBeVisible()
    await expectButtonsAreNotLinks(page)

    await page.goto('/nao-existe')
    await expectTextLink(page, page.getByRole('link', { name: 'Voltar à biblioteca' }))

    // Tela de erro: a fonte fora do ar ao buscar um dia passado.
    await page.route('**/api/puzzles?**', (route) =>
      route.fulfill({
        status: 502,
        contentType: 'application/json',
        body: JSON.stringify({ error: 'source-unavailable', message: 'x' }),
      }),
    )
    await page.goto(`/dia/${yesterday()}?fonte=oglobo`)
    const retry = page.getByRole('button', { name: 'Tentar de novo' })
    await expectControlBorder(page, retry)
    expect(await css(retry, 'background-color')).toBe(await tokenBackground(page, '--control'))
    await expectTextLink(page, page.getByRole('link', { name: 'Voltar à biblioteca' }))
    await expectButtonsAreNotLinks(page)
  })

  test('"Tamanho padrão" é um botão com a cor do texto, contorno e estados', async ({ page }) => {
    await openToday(page)
    const reset = page.getByRole('button', { name: 'Tamanho padrão' })
    expect(await css(reset, 'color')).toBe(await tokenColor(page, '--ink'))
    await expectControlBorder(page, reset)
    const handle = page.getByRole('slider', { name: 'Tamanho do tabuleiro' })
    await handle.focus()
    await page.keyboard.press('Home')
    await expectStates(page, reset)
  })

  test('links com cara de botão, cartão ou controle ganham os estados do tipo', async ({
    page,
  }) => {
    await page.goto('/')
    const accent = await tokenColor(page, '--accent')

    // "Entrar" do visitante: link com aparência de botão discreto.
    const enter = page.getByRole('banner').getByRole('link', { name: 'Entrar' })
    await expectControlBorder(page, enter)
    expect(await css(enter, 'text-decoration-line')).toBe('none')
    await enter.hover()
    await expect.poll(() => backgroundImage(enter)).not.toBe('none')

    // Marca: muda para a cor de destaque.
    const brand = page.getByRole('link', { name: 'Cruzadinha' })
    await brand.hover()
    await expect.poll(() => css(brand, 'color')).toBe(accent)

    // Cartão "Hoje" e dia do calendário: borda de destaque com o mouse e fundo ao pressionar.
    for (const link of [
      page.getByRole('link', { name: /^O Globo: / }),
      page.locator('table a').first(),
    ]) {
      await link.hover()
      await expect.poll(() => css(link, 'border-top-color')).toBe(accent)
      await page.mouse.down()
      await expect.poll(() => backgroundImage(link)).not.toBe('none')
      await page.mouse.move(0, 0)
      await page.mouse.up()
    }

    // Voltar da barra do jogo: botão de ícone.
    await openToday(page)
    const back = page.getByRole('link', { name: 'Escolher outro dia' })
    await back.hover()
    await expect.poll(() => backgroundImage(back)).not.toBe('none')
  })
})

// O estado selecionado continua igual com o mouse por cima, e a camada de mouse se soma a ele.
async function expectSelectedKept(page: Page, control: Locator) {
  await control.scrollIntoViewIfNeeded()
  await page.mouse.move(0, 0)
  const rest = {
    shadow: await css(control, 'box-shadow'),
    background: await css(control, 'background-color'),
  }
  await control.hover()
  await expect.poll(() => backgroundImage(control)).not.toBe('none')
  expect(await css(control, 'box-shadow')).toBe(rest.shadow)
  expect(await css(control, 'background-color')).toBe(rest.background)
}

// O contraste dos estados do tabuleiro é uma exceção assumida (feature 010, FR-026).
const axe = (page: Page) => new AxeBuilder({ page }).exclude('[role="grid"]')

async function expectNoAxeViolations(page: Page) {
  expect((await axe(page).analyze()).violations).toEqual([])
}

async function failSourceRequests(page: Page) {
  await page.route('**/api/puzzles?**', (route) =>
    route.fulfill({
      status: 502,
      contentType: 'application/json',
      body: JSON.stringify({ error: 'source-unavailable', message: 'x' }),
    }),
  )
}

test.describe('023 US4: consistência entre telas e temas', () => {
  test('aba, segmento e chave mantêm o selecionado com o mouse por cima', async ({ page }) => {
    await page.goto('/')
    await expectSelectedKept(page, page.getByRole('tab', { selected: true }))

    const dialog = await openSettings(page)
    await expectSelectedKept(
      page,
      dialog.getByRole('group', { name: 'Cruzada padrão' }).locator('[aria-pressed="true"]'),
    )
    const toggle = dialog.getByRole('switch', { name: 'Riscar a dica só quando acerta' })
    if ((await toggle.getAttribute('aria-checked')) !== 'true') await toggle.click()
    expect(await css(toggle, 'background-color')).toBe(await tokenBackground(page, '--accent'))
    await expectSelectedKept(page, toggle)
  })

  test('linhas de dica: mouse por cima só sem destaque, sem mover nada', async ({ page }) => {
    await openToday(page)
    const plain = page.locator('ol button:not([aria-current])').first()
    const active = page.locator('ol button[aria-current="true"]')
    const before = { plain: await box(plain), active: await box(active) }
    const activeBackground = await css(active, 'background-color')

    await plain.hover()
    await expect.poll(() => backgroundImage(plain)).not.toBe('none')
    expectSameBox(await box(plain), before.plain)

    await active.hover()
    expect(await css(active, 'background-color')).toBe(activeBackground)
    expect(await backgroundImage(active)).toBe('none')
    expectSameBox(await box(active), before.active)
  })

  test('cores forçadas: todo botão tem contorno', async ({ page }) => {
    await page.emulateMedia({ forcedColors: 'active' })
    const expectBorders = async () => {
      const controls = page.locator(
        // Botões e os links com aparência de botão: "Entrar" do cabeçalho e o voltar da barra do
        // jogo. Os links de texto continuam sem contorno.
        'button:visible, header a:visible:not([href="/"]), a[aria-label="Escolher outro dia"]',
      )
      const borders = await controls.evaluateAll((elements) =>
        elements.map((element) => {
          const style = getComputedStyle(element)
          return {
            name: element.getAttribute('aria-label') ?? element.textContent ?? '',
            style: style.borderTopStyle,
            width: parseFloat(style.borderTopWidth),
          }
        }),
      )
      expect(borders.length).toBeGreaterThan(0)
      for (const border of borders) {
        expect(border.style, border.name).not.toBe('none')
        expect(border.width, border.name).toBeGreaterThanOrEqual(1)
      }
    }
    await page.goto('/')
    await expectBorders()
    const dialog = await openSettings(page)
    await expect(dialog).toBeVisible()
    await expectBorders()
    await dialog.getByRole('button', { name: 'Fechar' }).click()
    await openToday(page)
    await expectBorders()
  })

  test('dois secundários em telas diferentes têm a mesma aparência', async ({ page }) => {
    const look = async (button: Locator) => ({
      background: await css(button, 'background-color'),
      border: await css(button, 'border-top-color'),
      radius: await css(button, 'border-top-left-radius'),
      height: await css(button, 'min-height'),
    })
    await page.goto('/')
    await page.mouse.move(0, 0)
    const calendar = await look(page.getByRole('button', { name: 'Mês anterior' }))
    await openToday(page)
    await fillSolution(page, await todaySolution(page.request))
    const done = page.getByRole('dialog', { name: 'Cruzada concluída' })
    await expect(done).toBeVisible()
    await page.mouse.move(0, 0)
    expect(await look(done.getByRole('button', { name: 'Ver o tabuleiro' }))).toEqual(calendar)
  })

  for (const theme of THEMES) {
    test(`axe sem violações nas telas, tema ${theme}`, async ({ page }) => {
      await page.emulateMedia({ colorScheme: theme })
      for (const path of ['/login', '/cadastro', '/', '/nao-existe']) {
        await page.goto(path)
        await page.getByRole('heading', { level: 1 }).first().waitFor()
        await expectNoAxeViolations(page)
      }
      await page.goto('/')
      await openSettings(page)
      await expectNoAxeViolations(page)
      await page.getByRole('dialog').getByRole('button', { name: 'Fechar' }).click()

      await openToday(page)
      await expectNoAxeViolations(page)
      await fillSolution(page, await todaySolution(page.request))
      await expect(page.getByRole('dialog', { name: 'Cruzada concluída' })).toBeVisible()
      await expectNoAxeViolations(page)

      await failSourceRequests(page)
      await page.goto(`/dia/${yesterday()}?fonte=oglobo`)
      await expect(page.getByRole('button', { name: 'Tentar de novo' })).toBeVisible()
      await expectNoAxeViolations(page)
    })
  }
})
