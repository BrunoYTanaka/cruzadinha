import AxeBuilder from '@axe-core/playwright'
import { expect, test, type Locator, type Page, type Route } from '@playwright/test'
import { box, css, expectNear, resetAndSeed } from './support'

// Feature 027: toda tela de erro tem um único h1 e passa no axe sem regra desativada. O erro
// dentro da biblioteca (que já tem o h1 "Hoje") entra como h2. As falhas são simuladas no navegador.

test.beforeEach(async () => {
  await resetAndSeed()
})

const THEMES = ['light', 'dark'] as const

// O contraste dos estados do tabuleiro é uma exceção assumida (feature 010, FR-026).
const axe = (page: Page) => new AxeBuilder({ page }).exclude('[role="grid"]')

async function expectNoAxeViolations(page: Page) {
  expect((await axe(page).analyze()).violations).toEqual([])
}

// Só as regras de título: com o calendário em erro, as abas apontam (`aria-controls`) para um painel
// que só existe com o calendário carregado, defeito antigo da feature 015, fora desta correção.
async function expectNoHeadingViolations(page: Page) {
  const results = await axe(page)
    .withRules(['page-has-heading-one', 'heading-order', 'empty-heading'])
    .analyze()
  expect(results.violations).toEqual([])
}

async function expectSingleH1(page: Page, name: string | RegExp) {
  const headings = page.getByRole('heading', { level: 1 })
  await expect(headings).toHaveCount(1)
  await expect(headings).toHaveText(name)
}

function failWith(status: number, error: string, headers: Record<string, string> = {}) {
  return (route: Route) =>
    route.fulfill({
      status,
      headers,
      contentType: 'application/json',
      body: JSON.stringify({ error, message: 'x' }),
    })
}

function yesterday() {
  const date = new Date(Date.now() - 24 * 60 * 60 * 1000)
  return date.toISOString().slice(0, 10)
}

const DAY = () => `/dia/${yesterday()}?fonte=oglobo`

for (const theme of THEMES) {
  test.describe(`tema ${theme}`, () => {
    test.beforeEach(async ({ page }) => {
      await page.emulateMedia({ colorScheme: theme })
    })

    test('dia: fonte fora do ar, sem cruzada, muitas buscas e sem rede', async ({ page }) => {
      const cases: Array<[(route: Route) => Promise<void>, string]> = [
        [failWith(502, 'puzzle-source-failed'), 'A fonte está fora do ar agora.'],
        [failWith(404, 'puzzle-unavailable'), 'Não há cruzada neste dia.'],
        [failWith(429, 'too-many-attempts', { 'retry-after': '90' }), 'Muitas buscas seguidas.'],
        [(route) => route.abort('internetdisconnected'), 'Sem conexão'],
      ]
      for (const [handler, title] of cases) {
        await page.route('**/api/puzzles?**', handler)
        await page.goto(DAY())
        await expectSingleH1(page, title)
        await expectNoAxeViolations(page)
        await page.unroute('**/api/puzzles?**')
      }
    })

    test('cruzada: não encontrada e com falha', async ({ page }) => {
      const id = '00000000-0000-4000-8000-000000000000'
      await page.route('**/api/puzzles/*', failWith(404, 'puzzle-unavailable'))
      await page.goto(`/jogo/${id}`)
      await expectSingleH1(page, 'Cruzada não encontrada.')
      await expectNoAxeViolations(page)

      await page.unroute('**/api/puzzles/*')
      await page.route('**/api/puzzles/*', failWith(500, 'internal-error'))
      await page.goto(`/jogo/${id}`)
      await expectSingleH1(page, 'Não foi possível abrir a cruzada')
      await expectNoAxeViolations(page)
    })

    test('biblioteca: a falha do calendário é h2 sob o h1 "Hoje"', async ({ page }) => {
      await page.route('**/api/library?**', failWith(500, 'internal-error'))
      await page.goto('/')
      await expectSingleH1(page, 'Hoje')
      await expect(
        page.getByRole('heading', { level: 2, name: 'Não foi possível carregar a biblioteca' }),
      ).toBeVisible()
      await expectNoHeadingViolations(page)
    })

    test('biblioteca: a API anterior (401 sem sessão) pede para entrar', async ({ page }) => {
      await page.route('**/api/library?**', failWith(401, 'unauthenticated'))
      await page.goto('/')
      await expectSingleH1(page, 'Entre para ver a biblioteca')
      await expectNoAxeViolations(page)
    })

    test('"Acordando o servidor" tem o h1', async ({ page }) => {
      await page.route('**/api/health', async (route) => {
        await new Promise((resolve) => setTimeout(resolve, 5_000))
        await route.continue()
      })
      await page.goto('/')
      await expectSingleH1(page, 'Acordando o servidor')
      await expectNoAxeViolations(page)
    })

    test('erro de rota: um h1 antes, durante e depois de tentar de novo', async ({ page }) => {
      await page.clock.install()
      await page.route('**/api/health', failWith(503, 'service-unavailable'))
      await page.goto('/login')
      for (let elapsed = 0; elapsed <= 92_000; elapsed += 2_000) {
        await page.clock.fastForward(2_000)
        await page.waitForTimeout(20)
      }
      await expectSingleH1(page, 'Não foi possível falar com o servidor.')
      await expectNoAxeViolations(page)

      await page.getByRole('button', { name: 'Tentar de novo' }).click()
      await expectSingleH1(page, 'Acordando o servidor')
    })

    // SC-004: trocar a tag não muda a aparência. Compara o h1 com um h2 de mesma classe no mesmo
    // lugar (o estilo vem da classe, não do nível).
    test('o título do erro tem a mesma aparência que tinha como h2', async ({ page }) => {
      await page.route('**/api/puzzles?**', failWith(502, 'puzzle-source-failed'))
      await page.goto(DAY())
      const title = page.getByRole('heading', { level: 1 })
      await expect(title).toHaveCount(1)
      const look = async (heading: Locator) => ({
        fontSize: await css(heading, 'font-size'),
        fontWeight: await css(heading, 'font-weight'),
        color: await css(heading, 'color'),
        margin: await css(heading, 'margin'),
        box: await box(heading),
      })
      const asH1 = await look(title)
      await title.evaluate((element) => {
        const clone = document.createElement('h2')
        clone.className = element.className
        clone.textContent = element.textContent
        element.replaceWith(clone)
      })
      const asH2 = await look(page.getByRole('heading', { level: 2 }))
      expect(asH1.fontSize).toBe('20px')
      expect({ ...asH1, box: undefined }).toEqual({ ...asH2, box: undefined })
      expectNear(asH1.box.x, asH2.box.x)
      expectNear(asH1.box.y, asH2.box.y)
      expectNear(asH1.box.width, asH2.box.width)
      expectNear(asH1.box.height, asH2.box.height)
    })
  })
}
