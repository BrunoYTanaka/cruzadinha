import { vi } from 'vitest'

export type Handler = (request: {
  url: string
  method: string
  body: unknown
}) => Response | Promise<Response>

export function jsonResponse(
  status: number,
  body?: unknown,
  headers: Record<string, string> = {},
): Response {
  return new Response(body === undefined ? null : JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json', ...headers },
  })
}

export function apiError(status: number, error: string, extra: Record<string, unknown> = {}) {
  return jsonResponse(status, { error, message: 'x', ...extra })
}

// Troca o `fetch` global: chaves como "POST /api/auth/login" (o caminho sem a query). Rota sem
// handler responde 404, para o teste falhar alto em vez de ficar esperando.
export function mockApi(handlers: Record<string, Handler>) {
  const calls: { key: string; url: string; body: unknown }[] = []
  const fetchMock = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
    const url = String(input)
    const method = init?.method ?? 'GET'
    const key = `${method} ${url.split('?')[0]}`
    let body: unknown
    if (typeof init?.body === 'string') body = JSON.parse(init.body)
    // O pedido da lista de fontes (padrão do teste) não conta: os testes olham as chamadas da tela.
    if (key !== 'GET /api/sources' || handlers[key]) calls.push({ key, url, body })
    // Feature 060: o site pede a lista de fontes visíveis em quase toda tela; sem handler próprio,
    // o teste vê todas as fontes (como uma API sem configuração).
    const handler =
      handlers[key] ??
      (key === 'GET /api/sources'
        ? () =>
            jsonResponse(200, { sources: ['oglobo', 'cruzadaonline', 'cruzadasbrasil', 'clube'] })
        : undefined)
    if (!handler) return jsonResponse(404, { error: 'puzzle-unavailable', message: 'x' })
    return handler({ url, method, body })
  })
  vi.stubGlobal('fetch', fetchMock)
  return { fetch: fetchMock, calls }
}
