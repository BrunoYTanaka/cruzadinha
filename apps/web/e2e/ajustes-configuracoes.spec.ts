import AxeBuilder from '@axe-core/playwright'
import { expect, test, type Locator, type Page } from '@playwright/test'
import { box, css, expectNear, resetAndSeed } from './support'

// Feature 024: ajustes de layout e animação nas configurações e no botão de tema (issue #40).
// Medidas de caixa em Chromium: o jsdom não faz layout.

test.beforeEach(async () => {
  await resetAndSeed()
})

const WIDTHS = [320, 360, 861, 1920]
const MARGIN = 8

function expectSameSize(boxes: { width: number; height: number }[]) {
  const [reference, ...rest] = boxes
  if (!reference) throw new Error('nenhum botão para comparar')
  for (const item of rest) {
    expectNear(item.height, reference.height)
    expectNear(item.width, reference.width)
  }
}

async function openSettings(page: Page) {
  await page.getByRole('button', { name: 'Configurações' }).click()
  return page.getByRole('dialog', { name: 'Configurações' })
}

test.describe('US1: balão da engrenagem dentro da janela', () => {
  for (const width of WIDTHS) {
    test(`com a janela em ${width} px`, async ({ page }) => {
      await page.setViewportSize({ width, height: 800 })
      await page.goto('/')
      const gear = page.getByRole('button', { name: 'Configurações' })
      await gear.focus()
      const tip = page.locator('[data-tooltip]', { hasText: 'Configurações' })
      await expect(tip).toBeVisible()
      const tipBox = await box(tip)
      expect(tipBox.x).toBeGreaterThanOrEqual(MARGIN - 0.5)
      expect(tipBox.x + tipBox.width).toBeLessThanOrEqual(width - MARGIN + 0.5)
    })

    // Com a API acordando, a sessão demora: o cabeçalho mostra só a engrenagem, rente à borda
    // direita (sem "Visitante" nem "Entrar" ao lado).
    test(`com a sessão ainda carregando e a janela em ${width} px`, async ({ page }) => {
      await page.route('**/api/auth/me', async (route) => {
        await new Promise((resolve) => setTimeout(resolve, 3_000))
        await route.continue()
      })
      await page.setViewportSize({ width, height: 800 })
      await page.goto('/')
      const gear = page.getByRole('button', { name: 'Configurações' })
      await expect(gear).toBeVisible()
      await expect(page.getByText('Visitante')).toHaveCount(0)
      await gear.focus()
      const tip = page.locator('[data-tooltip]', { hasText: 'Configurações' })
      await expect(tip).toBeVisible()
      const tipBox = await box(tip)
      expect(tipBox.x).toBeGreaterThanOrEqual(MARGIN - 0.5)
      expect(tipBox.x + tipBox.width).toBeLessThanOrEqual(width - MARGIN + 0.5)
    })
  }

  test('o balão que já cabia continua centralizado sobre o botão', async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 800 })
    await page.goto('/')
    const dialog = await openSettings(page)
    const theme = dialog.getByRole('button', { name: /^Tema:/ })
    await theme.hover()
    await page.mouse.move(0, 0)
    await theme.focus()
    const tip = page.locator('[data-tooltip]', { hasText: /^Mudar para/ })
    await expect(tip).toBeVisible()
    const tipBox = await box(tip)
    const themeBox = await box(theme)
    expectNear(tipBox.x + tipBox.width / 2, themeBox.x + themeBox.width / 2)
  })
})

test.describe('US2: botão de tema com o mesmo tamanho nos três estados', () => {
  for (const scheme of ['light', 'dark'] as const) {
    for (const width of [1280, 360]) {
      test(`tema do sistema ${scheme}, janela em ${width} px`, async ({ page }) => {
        await page.emulateMedia({ colorScheme: scheme })
        await page.setViewportSize({ width, height: 900 })
        await page.goto('/')
        const dialog = await openSettings(page)
        const theme = dialog.getByRole('button', { name: /^Tema:/ })
        const title = dialog.getByText('Tema', { exact: true })
        const hint = dialog.getByText(/^(Segue o aparelho|Toque para trocar)\./)

        const first = await box(theme)
        const firstTitle = await box(title)
        // Automático → claro → escuro → automático: o ciclo inteiro, com o tamanho sempre igual.
        for (let step = 0; step < 3; step += 1) {
          await theme.click()
          const now = await box(theme)
          expect(now.width).toBe(first.width)
          expect(now.height).toBe(first.height)
          expectNear(now.x, first.x)
          expectNear((await box(title)).x, firstTitle.x)
          expectNear((await box(title)).y, firstTitle.y)
          await expect(hint).toBeVisible()
        }
      })
    }
  }

  test('só o rótulo do tema atual aparece e o nome acessível diz o estado', async ({ page }) => {
    await page.goto('/')
    const dialog = await openSettings(page)
    const theme = dialog.getByRole('button', { name: /^Tema:/ })
    await expect(theme).toHaveAccessibleName('Tema: automático. Mudar para claro')
    await theme.click()
    await expect(theme).toHaveAccessibleName('Tema: claro. Mudar para escuro')
    const visible = theme.locator('[data-label]:not([data-active])')
    for (const hidden of await visible.all()) {
      expect(await css(hidden, 'visibility')).toBe('hidden')
    }
    expect(await css(theme.locator('[data-label][data-active]'), 'visibility')).toBe('visible')
  })
})

test.describe('US3: modal alinhada em qualquer tela', () => {
  for (const scheme of ['light', 'dark'] as const) {
    for (const width of WIDTHS) {
      test(`tema ${scheme}, janela em ${width} px`, async ({ page }) => {
        await page.emulateMedia({ colorScheme: scheme })
        await page.setViewportSize({ width, height: 900 })
        await page.goto('/')
        const dialog = await openSettings(page)
        const content = await dialog.evaluate((element) => {
          const body = element.querySelector('[class*="body"]')!.getBoundingClientRect()
          return { left: body.left, right: body.right }
        })

        // Interruptores: mesmo tamanho e a borda direita na borda direita do conteúdo (SC-008).
        await expect(dialog.getByRole('switch')).toHaveCount(2)
        const [first, second] = [
          await box(dialog.getByRole('switch').nth(0)),
          await box(dialog.getByRole('switch').nth(1)),
        ]
        expectNear(first.width, second.width)
        expectNear(first.height, second.height)
        expectNear(first.x + first.width, content.right)
        expectNear(second.x + second.width, content.right)

        // "Restaurar padrões": a caixa visível, com o contorno, começa na margem esquerda do
        // conteúdo e nunca antes dela (feature 025, SC-004; substitui a regra do texto da 024).
        const restore = dialog.getByRole('button', { name: 'Restaurar padrões' })
        const restoreBox = await box(restore)
        expectNear(restoreBox.x, content.left)
        expect(restoreBox.x).toBeGreaterThanOrEqual(content.left - 0.5)
        expect(restoreBox.height).toBeGreaterThanOrEqual(44)

        // Seletor: com mais de 3 fontes (feature 030) é uma lista de rádios, uma opção por fonte.
        await expect(
          dialog.getByRole('group', { name: 'Cruzada padrão' }).getByRole('radio'),
        ).toHaveCount(4)

        // Sem rolagem lateral na modal.
        const overflow = await dialog.evaluate(
          (element) => element.scrollWidth - element.clientWidth,
        )
        expect(overflow).toBeLessThanOrEqual(0)

        const results = await new AxeBuilder({ page }).exclude('[role="grid"]').analyze()
        expect(results.violations).toEqual([])
      })
    }
  }

  // O seletor em botões só existe com até 3 fontes; com as 4 reais (feature 030) é uma lista de
  // rádios, e o caso de botões está nos testes de `SettingsDialog.test.tsx` (2 e 3 fontes).
  test.skip('nome de fonte longo não desalinha os botões do seletor', async ({ page }) => {
    await page.setViewportSize({ width: 360, height: 900 })
    await page.goto('/')
    const dialog = await openSettings(page)
    const sources = await dialog
      .getByRole('group', { name: 'Cruzada padrão' })
      .getByRole('button')
      .all()
    await dialog
      .getByRole('group', { name: 'Cruzada padrão' })
      .getByRole('button')
      .first()
      .evaluate((button) => {
        button.textContent = 'Uma fonte com um nome bem comprido de propósito'
      })
    expectSameSize(await Promise.all(sources.map((source) => box(source))))
    const overflow = await dialog.evaluate((element) => element.scrollWidth - element.clientWidth)
    expect(overflow).toBeLessThanOrEqual(0)
  })

  test('com zoom de 200 % (janela de 640 px de CSS) a modal segue legível e alinhada', async ({
    page,
  }) => {
    await page.setViewportSize({ width: 640, height: 900 })
    await page.goto('/')
    const dialog = await openSettings(page)
    const overflow = await dialog.evaluate((element) => element.scrollWidth - element.clientWidth)
    expect(overflow).toBeLessThanOrEqual(0)
    const restore = dialog.getByRole('button', { name: 'Restaurar padrões' })
    await expect(restore).toBeVisible()
    const left = await dialog.evaluate(
      (element) => element.querySelector('[class*="body"]')!.getBoundingClientRect().left,
    )
    expect((await box(restore)).x).toBeGreaterThanOrEqual(left - 0.5)
  })
})

test.describe('US4: "Sem limite" à direita em telas maiores', () => {
  const rows = (dialog: Locator) => [
    dialog.getByRole('group', { name: 'Letras' }),
    dialog.getByRole('group', { name: 'Palavras' }),
  ]
  const row = (dialog: Locator, index: 0 | 1) => rows(dialog)[index] as Locator

  test('em 1280 px fica na linha dos passos, encostada na borda direita', async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 900 })
    await page.goto('/')
    const dialog = await openSettings(page)
    const content = await dialog.evaluate(
      (element) => element.querySelector('[class*="body"]')!.getBoundingClientRect().right,
    )
    for (const row of rows(dialog)) {
      const check = await box(row.getByLabel('Sem limite'))
      const label = await box(row.locator('label'))
      const minus = await box(row.getByRole('button', { name: /^Menos/ }))
      // Mesma linha dos passos (centros na mesma altura) e borda direita no limite do conteúdo.
      expectNear(label.y + label.height / 2, minus.y + minus.height / 2)
      expectNear(label.x + label.width, content)
      expect(check.width).toBeGreaterThan(0)
    }
    // O mesmo ponto nas linhas de letras e de palavras (SC-005).
    const letters = await box(row(dialog, 0).locator('label'))
    const words = await box(row(dialog, 1).locator('label'))
    expectNear(letters.x + letters.width, words.x + words.width)
  })

  test('em 360 px desce para uma linha própria, à esquerda, sem sair da modal', async ({
    page,
  }) => {
    await page.setViewportSize({ width: 360, height: 900 })
    await page.goto('/')
    const dialog = await openSettings(page)
    const dialogBox = await box(dialog)
    for (const row of rows(dialog)) {
      const label = await box(row.locator('label'))
      const name = await box(row.locator('span').first())
      const minus = await box(row.getByRole('button', { name: /^Menos/ }))
      expect(label.y).toBeGreaterThanOrEqual(minus.y + minus.height - 1)
      expectNear(label.x, name.x)
      expect(label.x + label.width).toBeLessThanOrEqual(dialogBox.x + dialogBox.width)
    }
  })

  test('marcar e desmarcar "Sem limite" não muda a posição dos controles', async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 900 })
    await page.goto('/')
    const dialog = await openSettings(page)
    const row = rows(dialog)[0] as Locator
    const parts = () =>
      Promise.all([
        box(row.locator('span').first()),
        box(row.getByRole('button', { name: /^Menos/ })),
        box(row.getByRole('button', { name: /^Mais/ })),
        box(row.locator('output')),
        box(row.locator('label')),
      ])
    const before = await parts()
    await row.getByLabel('Sem limite').check()
    const during = await parts()
    await row.getByLabel('Sem limite').uncheck()
    const after = await parts()
    for (const other of [during, after]) {
      other.forEach((item, index) => {
        const reference = before[index]
        if (!reference) throw new Error('parte sem medida inicial')
        expectNear(item.x, reference.x)
        expectNear(item.y, reference.y)
        expectNear(item.width, reference.width)
      })
    }
  })
})

// O destaque deslizante só existe com até 3 fontes; com as 4 reais (feature 030) o seletor é uma
// lista de rádios. A transição e o toque seguem cobertos pelos testes de `SettingsDialog.test.tsx`
// (2 e 3 fontes), que não dependem de quantas fontes o site tem.
test.describe.skip('US5: troca suave da cruzada padrão', () => {
  async function picker(page: Page) {
    const dialog = await openSettings(page)
    const group = dialog.getByRole('group', { name: 'Cruzada padrão' })
    return {
      group,
      thumb: group.locator('[data-thumb]'),
      globo: group.getByRole('button', { name: 'O Globo' }),
      online: group.getByRole('button', { name: 'Cruzada Online' }),
    }
  }

  // Espera a transição acabar: o destaque passa a coincidir com o botão escolhido.
  async function expectThumbOn(thumb: Locator, button: Locator) {
    await expect
      .poll(async () => {
        const [a, b] = [await box(thumb), await box(button)]
        return Math.max(Math.abs(a.x - b.x), Math.abs(a.y - b.y), Math.abs(a.width - b.width))
      })
      .toBeLessThanOrEqual(1)
  }

  test('o destaque desliza em 100 a 300 ms até a fonte escolhida', async ({ page }) => {
    await page.goto('/')
    const { thumb, globo, online } = await picker(page)
    await expectThumbOn(thumb, globo)
    const duration = parseFloat(await css(thumb, 'transition-duration')) * 1000
    expect(duration).toBeGreaterThanOrEqual(100)
    expect(duration).toBeLessThanOrEqual(300)
    await online.click()
    await expectThumbOn(thumb, online)
    await expect(online).toHaveAttribute('aria-pressed', 'true')
  })

  test('dois cliques rápidos terminam na última fonte escolhida', async ({ page }) => {
    await page.goto('/')
    const { thumb, globo, online } = await picker(page)
    await online.click()
    await globo.click()
    await expectThumbOn(thumb, globo)
    await online.click()
    await globo.click()
    await online.click()
    await expectThumbOn(thumb, online)
    await expect(online).toHaveAttribute('aria-pressed', 'true')
  })

  test('com movimento reduzido a troca é imediata', async ({ page }) => {
    await page.emulateMedia({ reducedMotion: 'reduce' })
    await page.goto('/')
    const { thumb, online } = await picker(page)
    // A regra global de movimento reduzido usa 0.00001 s em vez de 0.
    expect(parseFloat(await css(thumb, 'transition-duration'))).toBeLessThan(0.001)
    await online.click()
    await expectThumbOn(thumb, online)
  })

  test('pelo teclado a troca é igual e o foco continua visível', async ({ page }) => {
    await page.goto('/')
    const { thumb, globo, online } = await picker(page)
    await online.focus()
    await page.keyboard.press('Enter')
    await expectThumbOn(thumb, online)
    await globo.focus()
    await page.keyboard.press('Space')
    await expectThumbOn(thumb, globo)
    expect(await css(globo, 'outline-style')).not.toBe('none')
  })

  test('em cores forçadas o destaque tem borda e a fonte marcada se distingue', async ({
    page,
  }) => {
    await page.emulateMedia({ forcedColors: 'active' })
    await page.goto('/')
    const { thumb } = await picker(page)
    expect(await css(thumb, 'border-top-width')).toBe('1px')
    expect(await css(thumb, 'border-top-style')).toBe('solid')
    expect(await css(thumb, 'border-top-color')).not.toBe('rgba(0, 0, 0, 0)')
  })
})

test.describe.skip('US5: toque', () => {
  test.use({ hasTouch: true })

  test('um toque troca a fonte e o destaque a acompanha', async ({ page }) => {
    await page.goto('/')
    await page.getByRole('button', { name: 'Configurações' }).tap()
    const group = page
      .getByRole('dialog', { name: 'Configurações' })
      .getByRole('group', { name: 'Cruzada padrão' })
    await group.getByRole('button', { name: 'Cruzada Online' }).tap()
    await expect(group.getByRole('button', { name: 'Cruzada Online' })).toHaveAttribute(
      'aria-pressed',
      'true',
    )
    await expect
      .poll(async () => {
        const [a, b] = [
          await box(group.locator('[data-thumb]')),
          await box(group.getByRole('button', { name: 'Cruzada Online' })),
        ]
        return Math.abs(a.x - b.x)
      })
      .toBeLessThanOrEqual(1)
  })
})

// Feature 025: o interruptor mantém o trilho de 30 px e a área de toque de 44 px (issue #51).
test.describe('F025-US1: interruptor com o desenho certo', () => {
  // `dy` é a distância vertical a partir do centro do interruptor.
  const hitsSwitch = (toggle: Locator, dy: number) =>
    toggle.evaluate((element, offset) => {
      const rect = element.getBoundingClientRect()
      const hit = document.elementFromPoint(
        rect.left + rect.width / 2,
        rect.top + rect.height / 2 + offset,
      )
      return hit !== null && element.contains(hit)
    }, dy)

  for (const scheme of ['light', 'dark'] as const) {
    for (const width of [320, 360, 1280]) {
      test(`tema ${scheme}, janela em ${width} px`, async ({ page }) => {
        await page.emulateMedia({ colorScheme: scheme })
        await page.setViewportSize({ width, height: 900 })
        await page.goto('/')
        const dialog = await openSettings(page)
        const switches = dialog.getByRole('switch')
        await expect(switches).toHaveCount(2)

        for (const index of [0, 1]) {
          const toggle = switches.nth(index)
          // No meio da área visível: a faixa de toque de 44 px também precisa estar na tela.
          await toggle.evaluate((element) => element.scrollIntoView({ block: 'center' }))
          let knobOffset: number | null = null
          // Duas passadas: desligado e ligado (ou o inverso).
          for (const pass of [0, 1]) {
            if (pass === 1) await toggle.click()
            const track = await box(toggle)
            expect(Math.abs(track.height - 30)).toBeLessThanOrEqual(0.5)
            expect(Math.abs(track.width - 52)).toBeLessThanOrEqual(0.5)

            const knob = await box(toggle.locator('[class*="knob"]'))
            const offset = knob.y + knob.height / 2 - (track.y + track.height / 2)
            expect(Math.abs(offset)).toBeLessThanOrEqual(0.5)
            if (knobOffset !== null) expect(Math.abs(offset - knobOffset)).toBeLessThanOrEqual(0.5)
            knobOffset = offset
          }

          await toggle.evaluate((element) => element.scrollIntoView({ block: 'center' }))
          // Faixa de toque de 44 px: dentro (±21) pega o interruptor, fora (±24) não.
          expect(await hitsSwitch(toggle, -21)).toBe(true)
          expect(await hitsSwitch(toggle, 21)).toBe(true)
          expect(await hitsSwitch(toggle, -24)).toBe(false)
          expect(await hitsSwitch(toggle, 24)).toBe(false)

          // Um clique real a 20 px do centro alterna o interruptor.
          const before = await toggle.getAttribute('aria-checked')
          const track = await box(toggle)
          await page.mouse.click(track.x + track.width / 2, track.y + track.height / 2 + 20)
          await expect(toggle).toHaveAttribute('aria-checked', before === 'true' ? 'false' : 'true')
        }

        // A faixa de toque não cobre nenhum outro controle do diálogo.
        const covered = await dialog.evaluate((element) => {
          const found: string[] = []
          for (const control of element.querySelectorAll<HTMLElement>(
            'button:not([role="switch"]), input, a[href]',
          )) {
            control.scrollIntoView({ block: 'center' })
            const rect = control.getBoundingClientRect()
            const hit = document.elementFromPoint(
              rect.left + rect.width / 2,
              rect.top + rect.height / 2,
            )
            if (hit?.closest('[role="switch"]')) found.push(control.textContent || control.tagName)
          }
          return found
        })
        expect(covered).toEqual([])
      })
    }
  }
})
