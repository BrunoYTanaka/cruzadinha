import type { ApiError } from '@cruzadinha/shared'
import { z } from 'zod'

// Repasse de /api/* para a API (feature 012, contracts/proxy.md). O navegador fala só com o
// endereço do site, então o cookie de sessão continua HttpOnly e SameSite=Lax, sem CORS.

const envSchema = z.object({
  API_ORIGIN: z.url({ protocol: /^https$/ }),
  PROXY_SECRET: z.string().min(32),
})

const OWN_HEADER_PREFIX = 'x-cruzadinha-'
// A API gratuita leva até cerca de um minuto para acordar; o site já tem a tela de espera.
const PROXY_TIMEOUT_MS = 25_000

// A página de "acordando" do provedor (HTML) e a falha de conexão viram um 503 JSON, que o site
// já trata como espera.
export function wakingResponse(): Response {
  const body: ApiError = {
    error: 'service-unavailable',
    message: 'O servidor está acordando. Tente de novo em instantes.',
  }
  return new Response(JSON.stringify(body), {
    status: 503,
    headers: { 'content-type': 'application/json; charset=utf-8', 'retry-after': '5' },
  })
}

export async function proxyRequest(
  request: Request,
  env: unknown,
  fetchImpl: typeof fetch,
): Promise<Response> {
  const parsed = envSchema.safeParse(env)
  if (!parsed.success) {
    // Sem valores: só o fato de faltar configuração.
    console.error('repasse sem configuração')
    return wakingResponse()
  }
  const { API_ORIGIN, PROXY_SECRET } = parsed.data

  const incoming = new URL(request.url)
  const target = new URL(incoming.pathname + incoming.search, API_ORIGIN)

  const headers = new Headers()
  for (const [name, value] of request.headers) {
    if (name === 'host' || name.startsWith(OWN_HEADER_PREFIX)) continue
    headers.append(name, value)
  }
  headers.set('x-cruzadinha-proxy-secret', PROXY_SECRET)
  const clientIp = request.headers.get('cf-connecting-ip')
  if (clientIp) headers.set('x-cruzadinha-client-ip', clientIp)

  const hasBody = request.method !== 'GET' && request.method !== 'HEAD'
  let response: Response
  try {
    response = await fetchImpl(target.toString(), {
      method: request.method,
      headers,
      body: hasBody ? await request.arrayBuffer() : undefined,
      redirect: 'manual',
      // Sem limite, um servidor travado prende o pedido até o limite da plataforma.
      signal: AbortSignal.timeout(PROXY_TIMEOUT_MS),
    })
  } catch (error) {
    // Só o nome do erro: a mensagem pode trazer o endereço da API.
    console.warn('repasse: falha de conexão', {
      error: error instanceof Error ? error.name : 'unknown',
    })
    return wakingResponse()
  }

  const contentType = response.headers.get('content-type')
  const isHtml = contentType?.includes('text/html') === true
  // Diagnóstico de "API não acorda": status e tipo, nunca o corpo.
  if (isHtml || response.status === 429 || response.status >= 500) {
    console.warn('repasse: resposta do servidor', { status: response.status, contentType })
  }
  if (isHtml) return wakingResponse()
  return response
}
