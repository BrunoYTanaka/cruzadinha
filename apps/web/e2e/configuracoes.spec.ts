import AxeBuilder from '@axe-core/playwright'
import { expect, test, type Page } from '@playwright/test'
import { fillSolution, login, resetAndSeed, todayPuzzle, todaySolution, typeWord } from './support'

test.beforeEach(async () => {
  await resetAndSeed()
})

// O contraste dos estados do tabuleiro é uma exceção assumida (feature 010, FR-026).
const axe = (page: Page) => new AxeBuilder({ page }).exclude('[role="grid"]')

async function openSettings(page: Page) {
  await page.getByRole('button', { name: 'Configurações' }).click()
  return page.getByRole('dialog', { name: 'Configurações' })
}

test.describe('US1: configurações no aparelho (feature 021)', () => {
  test('engrenagem com tooltip, modal que abre e fecha devolvendo o foco', async ({ page }) => {
    await page.goto('/')
    const gear = page.getByRole('button', { name: 'Configurações' })
    await expect(gear).toBeVisible()
    await gear.focus()
    await expect(page.locator('[data-tooltip]', { hasText: 'Configurações' })).toBeVisible()

    const dialog = await openSettings(page)
    await expect(dialog).toBeVisible()
    await dialog.getByRole('button', { name: 'Fechar' }).click()
    await expect(dialog).toHaveCount(0)
    await expect(gear).toBeFocused()
  })

  test('tema: claro → escuro → automático, com animação e persistência', async ({ page }) => {
    await page.goto('/')
    const dialog = await openSettings(page)
    const html = page.locator('html')
    const theme = dialog.getByRole('button', { name: /^Tema:/ })

    // Padrão automático: o próximo é claro.
    await theme.click()
    await expect(html).toHaveAttribute('data-theme', 'light')

    // Sem redução de movimento, a troca anima a página nova por no máximo 700 ms (SC-009).
    const durations = await page.evaluate(async () => {
      const button = document.querySelector<HTMLButtonElement>('[aria-label^="Tema:"]')
      button?.click()
      await new Promise((resolve) => requestAnimationFrame(() => resolve(null)))
      return document
        .getAnimations()
        .map((animation) => Number(animation.effect?.getTiming().duration ?? 0))
    })
    await expect(html).toHaveAttribute('data-theme', 'dark')
    const reveal = durations.filter((duration) => duration >= 300)
    expect(reveal.length).toBeGreaterThan(0)
    expect(Math.max(...reveal)).toBeLessThanOrEqual(700)

    await theme.click()
    await expect(html).not.toHaveAttribute('data-theme')
    await theme.click()
    await expect(html).toHaveAttribute('data-theme', 'light')

    // O tema já está aplicado no primeiro quadro depois de recarregar (script do index.html).
    await theme.click()
    await expect(html).toHaveAttribute('data-theme', 'dark')
    await page.addInitScript(() => {
      document.addEventListener('DOMContentLoaded', () => {
        document.documentElement.dataset.themeAtLoad =
          document.documentElement.getAttribute('data-theme') ?? 'none'
      })
    })
    await page.reload()
    await expect(html).toHaveAttribute('data-theme-at-load', 'dark')
  })

  test('com redução de movimento a troca de tema não anima', async ({ page }) => {
    await page.emulateMedia({ reducedMotion: 'reduce' })
    await page.goto('/')
    await openSettings(page)
    const durations = await page.evaluate(async () => {
      const button = document.querySelector<HTMLButtonElement>('[aria-label^="Tema:"]')
      button?.click()
      await new Promise((resolve) => requestAnimationFrame(() => resolve(null)))
      return document
        .getAnimations()
        .map((animation) => Number(animation.effect?.getTiming().duration ?? 0))
        .filter((duration) => duration >= 300)
    })
    expect(durations).toEqual([])
    await expect(page.locator('html')).toHaveAttribute('data-theme', 'light')
  })

  test('ajudas e riscar valem no jogo; restaurar padrões volta tudo', async ({ page }) => {
    await page.goto('/')
    let dialog = await openSettings(page)
    const letters = dialog.getByRole('group', { name: 'Letras' })
    await letters.getByRole('button', { name: 'Mais letras' }).click()
    await letters.getByRole('button', { name: 'Mais letras' }).click()
    await expect(letters.locator('output')).toHaveText('6')
    await dialog
      .getByRole('group', { name: 'Palavras' })
      .getByRole('checkbox', { name: 'Sem limite' })
      .check()
    await dialog.getByRole('switch', { name: 'Riscar a dica só quando acerta' }).click()
    await dialog.getByRole('button', { name: 'Fechar' }).click()

    await page.getByRole('link', { name: /^O Globo: / }).click()
    await expect(page.getByRole('grid')).toBeVisible()
    await expect(page.getByText('0/6 Letra')).toBeVisible()
    await expect(page.getByText('0/∞ Palavra')).toBeVisible()

    // Uma palavra completa e errada fica só riscada, sem visto.
    const { puzzle } = await todayPuzzle(page.request)
    const word = puzzle.words.find((item) => item.direction === 'across')!
    await typeWord(
      page,
      word,
      Array.from({ length: word.length }, () => 'X'),
    )
    const clue = page.getByRole('button', { name: /, preenchida$/ }).first()
    await expect(clue).toBeVisible()
    await expect(clue.locator('svg')).toHaveCount(0)

    dialog = await openSettings(page)
    await dialog.getByRole('button', { name: 'Restaurar padrões' }).click()
    await dialog.getByRole('button', { name: 'Fechar' }).click()
    await expect(page.getByText('0/4 Letra')).toBeVisible()
    await expect(page.getByRole('button', { name: /, preenchida$/ })).toHaveCount(0)
  })

  test('as escolhas continuam depois de recarregar', async ({ page }) => {
    await page.goto('/')
    const dialog = await openSettings(page)
    await dialog.getByRole('switch', { name: 'Riscar a dica só quando acerta' }).click()
    await page.reload()
    const again = await openSettings(page)
    await expect(
      again.getByRole('switch', { name: 'Riscar a dica só quando acerta' }),
    ).toHaveAttribute('aria-checked', 'false')
  })

  test('em 360 px a modal cabe sem rolagem lateral', async ({ page }) => {
    await page.setViewportSize({ width: 360, height: 740 })
    await page.goto('/')
    await openSettings(page)
    const width = await page.evaluate(() => document.documentElement.scrollWidth)
    expect(width).toBeLessThanOrEqual(360)
  })

  for (const theme of ['light', 'dark'] as const) {
    test(`acessibilidade da modal, tema ${theme}`, async ({ page }) => {
      await page.addInitScript(
        (value) => window.localStorage.setItem('cruzadinha:theme', value),
        theme,
      )
      await page.goto('/')
      await expect(page.locator('html')).toHaveAttribute('data-theme', theme)
      await openSettings(page)
      expect((await axe(page).analyze()).violations).toEqual([])
    })
  }
})

test.describe('US2: cruzada padrão e ir direto ao jogo (feature 021)', () => {
  test('a cruzada padrão abre a aba certa; trocar a aba e recarregar volta à padrão', async ({
    page,
  }) => {
    await page.goto('/')
    const dialog = await openSettings(page)
    await dialog
      .getByRole('group', { name: 'Cruzada padrão' })
      .getByRole('button', { name: 'Cruzada Online' })
      .click()
    await dialog.getByRole('button', { name: 'Fechar' }).click()
    await page.reload()
    const cruzada = page.getByRole('tab', { name: /^Cruzada Online/ })
    await expect(cruzada).toHaveAttribute('aria-selected', 'true')
    await page.getByRole('tab', { name: /^O Globo/ }).click()
    await page.reload()
    await expect(cruzada).toHaveAttribute('aria-selected', 'true')
  })

  test('com "Ir direto ao jogo", abrir / leva ao jogo de hoje sem mostrar o calendário', async ({
    page,
  }) => {
    await page.goto('/')
    const dialog = await openSettings(page)
    await dialog.getByRole('switch', { name: 'Ir direto ao jogo' }).click()
    await dialog.getByRole('button', { name: 'Fechar' }).click()

    // Conta se o calendário (tabpanel) chegou a aparecer antes da URL do jogo (SC-007).
    await page.addInitScript(() => {
      const seen = { calendar: false }
      ;(window as unknown as { calendarSeen: typeof seen }).calendarSeen = seen
      new MutationObserver(() => {
        if (location.pathname === '/' && document.querySelector('[role="tabpanel"]')) {
          seen.calendar = true
        }
      }).observe(document, { childList: true, subtree: true })
    })
    await page.goto('/')
    await expect(page).toHaveURL(/\/jogo\//)
    await expect(page.getByRole('grid')).toBeVisible()
    expect(
      await page.evaluate(
        () => (window as unknown as { calendarSeen: { calendar: boolean } }).calendarSeen.calendar,
      ),
    ).toBe(false)

    // O Voltar não repete o atalho; a volta pelo cabeçalho fica no calendário.
    await page.getByRole('link', { name: 'Cruzadinha' }).click()
    await expect(page.getByRole('heading', { level: 1, name: 'Hoje' })).toBeVisible()
  })

  test('concluída hoje, abre o calendário com o aviso citando a cruzada', async ({ page }) => {
    await page.goto('/')
    await page.getByRole('link', { name: /^O Globo: / }).click()
    await expect(page.getByRole('grid')).toBeVisible()
    await fillSolution(page, await todaySolution(page.request))
    await expect(page.getByRole('dialog')).toBeVisible()
    await page.keyboard.press('Escape')

    const dialog = await openSettings(page)
    await dialog.getByRole('switch', { name: 'Ir direto ao jogo' }).click()
    await dialog.getByRole('button', { name: 'Fechar' }).click()
    await page.goto('/')
    await expect(page.getByText('O Globo: a cruzada de hoje já foi concluída.')).toBeVisible()
    expect(page.url()).not.toContain('/jogo/')
  })
})

test.describe('US3: configurações salvas na conta (feature 021)', () => {
  // Espera o envio à conta que já traz o valor esperado (as mudanças podem sair em envios separados).
  const savedSettings = (page: Page, check: (settings: Record<string, unknown>) => boolean) =>
    page.waitForResponse((response) => {
      if (!response.url().endsWith('/api/settings') || response.request().method() !== 'PUT') {
        return false
      }
      const body = response.request().postDataJSON() as { settings: Record<string, unknown> }
      return response.ok() && check(body.settings)
    })

  test('mudanças num aparelho aparecem em outro em até 5 s; sair mantém no aparelho', async ({
    page,
    browser,
  }) => {
    await login(page)
    const dialog = await openSettings(page)
    const saved = savedSettings(
      page,
      (settings) => settings.theme === 'light' && settings.helpLetters === 5,
    )
    // O clique em + logo depois do tema cai durante a animação e não pode se perder (FR-007c).
    await dialog.getByRole('button', { name: /^Tema:/ }).click()
    await dialog
      .getByRole('group', { name: 'Letras' })
      .getByRole('button', { name: 'Mais letras' })
      .click()
    await expect(dialog.getByRole('group', { name: 'Letras' }).locator('output')).toHaveText('5')
    await saved
    await expect(page.locator('html')).toHaveAttribute('data-theme', 'light')

    const other = await browser.newContext()
    const second = await other.newPage()
    await login(second)
    await expect(second.locator('html')).toHaveAttribute('data-theme', 'light', { timeout: 5000 })
    const secondDialog = await openSettings(second)
    await expect(secondDialog.getByRole('group', { name: 'Letras' }).locator('output')).toHaveText(
      '5',
    )
    await other.close()

    await dialog.getByRole('button', { name: 'Fechar' }).click()
    await page.getByRole('button', { name: 'Sair' }).click()
    await expect(page.getByText('Visitante')).toBeVisible()
    await expect(page.locator('html')).toHaveAttribute('data-theme', 'light')
  })

  test('uma mudança que não chegou à conta é enviada ao reabrir já logado (FR-020c)', async ({
    page,
  }) => {
    await login(page)
    await page.route('**/api/settings', (route) =>
      route.request().method() === 'PUT' ? route.abort() : route.continue(),
    )
    const dialog = await openSettings(page)
    await dialog.getByRole('switch', { name: 'Riscar a dica só quando acerta' }).click()
    await expect(dialog.getByText(/Não foi possível salvar na sua conta agora/)).toBeVisible({
      timeout: 5000,
    })
    await page.unroute('**/api/settings')

    const saved = savedSettings(page, (settings) => settings.strikeMode === 'filled')
    await page.reload()
    const response = await saved
    expect((await response.json()).settings.strikeMode).toBe('filled')
  })
})
