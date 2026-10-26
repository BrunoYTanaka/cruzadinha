import { expect, test, type Page } from '@playwright/test'

// Feature 032 (issue #63): com a API dormindo, a sessão só é pedida depois de o servidor acordar.
// A API inteira é simulada no navegador (sem banco): a saúde responde 503 nas primeiras tentativas
// e a sessão falha enquanto a saúde não deu 200.

const WAKE_TITLE = 'Acordando o servidor'
const ERROR_TITLE = 'Algo deu errado'

type Sleeping = { calls: string[]; awake: () => boolean }

async function sleepingApi(page: Page, options: { session: boolean }): Promise<Sleeping> {
  let healthCalls = 0
  const awake = () => healthCalls > 3
  const calls: string[] = []
  const json = (status: number, body: unknown) => ({
    status,
    contentType: 'application/json',
    body: JSON.stringify(body),
  })
  await page.route('**/api/**', async (route) => {
    const path = new URL(route.request().url()).pathname
    calls.push(`${route.request().method()} ${path}`)
    if (path === '/api/health') {
      healthCalls += 1
      return route.fulfill(
        awake() ? json(200, { status: 'ok', database: 'up' }) : json(503, { error: 'x' }),
      )
    }
    if (path === '/api/auth/me') {
      if (!awake()) {
        return route.fulfill({
          status: 503,
          contentType: 'text/html',
          body: '<html>acordando</html>',
        })
      }
      return route.fulfill(
        options.session
          ? json(200, {
              user: { id: '0b9a3a4e-6d0e-4b6c-9a52-1f2e3d4c5b6a', email: 'ana@exemplo.com' },
            })
          : json(401, { error: 'unauthenticated', message: 'x' }),
      )
    }
    if (path === '/api/library') return route.fulfill(json(200, { items: [] }))
    if (path === '/api/settings')
      return route.fulfill(json(404, { error: 'not-found', message: 'x' }))
    return route.fulfill(json(404, { error: 'not-found', message: 'x' }))
  })
  return { calls, awake }
}

// Lê cabeçalho e corpo a cada 250 ms até o calendário aparecer.
async function sample(page: Page) {
  const rows: { header: string; wake: boolean; error: boolean; calendar: boolean }[] = []
  const calendar = page.getByRole('heading', { level: 1, name: 'Hoje' })
  for (let step = 0; step < 80; step++) {
    const row = {
      header: (
        (await page
          .locator('header')
          .innerText()
          .catch(() => '')) ?? ''
      ).replace(/\s+/g, ' '),
      wake: await page.getByRole('heading', { name: WAKE_TITLE }).isVisible(),
      error: await page.getByText(ERROR_TITLE).isVisible(),
      calendar: await calendar.isVisible(),
    }
    rows.push(row)
    if (row.calendar) break
    await page.waitForTimeout(250)
  }
  return rows
}

for (const session of [false, true]) {
  test(`API dormindo (${session ? 'com conta' : 'visitante'}): sem tela de erro, sem pedido antes da saúde e cabeçalho sem salto`, async ({
    page,
  }) => {
    const api = await sleepingApi(page, { session })
    await page.goto('/')
    const rows = await sample(page)

    expect(rows.at(-1)?.calendar).toBe(true)
    expect(rows.some((row) => row.error)).toBe(false)
    expect(rows.some((row) => row.wake)).toBe(true)
    // Só a saúde sai até o servidor acordar.
    const firstOther = api.calls.findIndex((call) => call !== 'GET /api/health')
    const lastHealth = api.calls.lastIndexOf('GET /api/health')
    expect(firstOther).toBeGreaterThan(lastHealth)
    // O cabeçalho mostra só o nome do site enquanto a espera está na tela.
    for (const row of rows.filter((item) => !item.calendar)) {
      expect(row.header).not.toMatch(/Visitante|Entrar|Sair|ana@/)
    }
    // Ao aparecer o calendário, a identidade já está no cabeçalho.
    const last = rows.at(-1)
    expect(last?.header).toMatch(session ? /ana@exemplo\.com/ : /Visitante/)
  })
}
