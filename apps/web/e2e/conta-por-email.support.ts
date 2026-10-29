import AxeBuilder from '@axe-core/playwright'
import { expect, type Page, type Route } from '@playwright/test'

// API simulada no navegador (sem banco) para as telas de confirmação de e-mail e de recuperação de
// senha (feature 035). Cada chamada fica anotada em `calls`.

export const TOKEN = 'k'.repeat(43)
export const NEW_PASSWORD = 'senha-nova-456'

export type Handler = (route: Route, body: unknown) => Promise<void> | void

export type FakeApi = {
  calls: { method: string; path: string; body: unknown }[]
}

export const json = (status: number, body: unknown, headers: Record<string, string> = {}) => ({
  status,
  headers,
  contentType: 'application/json',
  body: JSON.stringify(body),
})

export async function fakeApi(
  page: Page,
  handlers: Record<string, Handler>,
  options: { registrationOpen?: boolean; captchaRequired?: boolean } = {},
): Promise<FakeApi> {
  const api: FakeApi = { calls: [] }
  await page.route('**/api/**', async (route) => {
    const request = route.request()
    const path = new URL(request.url()).pathname
    const key = `${request.method()} ${path}`
    let body: unknown
    try {
      body = request.postDataJSON()
    } catch {
      body = undefined
    }
    api.calls.push({ method: request.method(), path, body })
    const handler = handlers[key]
    if (handler) return handler(route, body)
    if (key === 'GET /api/health') return route.fulfill(json(200, { status: 'ok', database: 'up' }))
    if (key === 'GET /api/auth/me') {
      return route.fulfill(json(401, { error: 'unauthenticated', message: 'x' }))
    }
    if (key === 'GET /api/auth/registration') {
      return route.fulfill(
        json(200, {
          open: options.registrationOpen ?? true,
          captchaRequired: options.captchaRequired ?? false,
        }),
      )
    }
    if (key === 'GET /api/library') return route.fulfill(json(200, { items: [] }))
    return route.fulfill(json(404, { error: 'puzzle-unavailable', message: 'x' }))
  })
  return api
}

// O contraste dos estados do tabuleiro é uma exceção assumida (feature 010); estas telas não têm
// tabuleiro, mas o filtro mantém o mesmo critério das demais.
export async function expectNoAxeViolations(page: Page) {
  const results = await new AxeBuilder({ page }).exclude('[role="grid"]').analyze()
  expect(results.violations).toEqual([])
}

export async function expectSingleH1(page: Page, name: string | RegExp) {
  const headings = page.getByRole('heading', { level: 1 })
  await expect(headings).toHaveCount(1)
  await expect(headings).toHaveText(name)
}

// Sem rolagem horizontal da página (FR-019, celular de 360 px).
export async function expectNoHorizontalScroll(page: Page) {
  const overflow = await page.evaluate(
    () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
  )
  expect(overflow).toBeLessThanOrEqual(0)
}
