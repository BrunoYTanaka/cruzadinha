import { apiErrorSchema, type ApiErrorCode } from '@cruzadinha/shared'
import type { z } from 'zod'

export class ApiRequestError extends Error {
  readonly status: number
  readonly code: ApiErrorCode | undefined
  readonly retryAfterSeconds: number | undefined
  readonly fields: string[] | undefined

  constructor(
    status: number,
    options: { code?: ApiErrorCode; retryAfterSeconds?: number; fields?: string[] } = {},
  ) {
    super(options.code ?? (status === 0 ? 'network-error' : `http-${status}`))
    this.name = 'ApiRequestError'
    this.status = status
    this.code = options.code
    this.retryAfterSeconds = options.retryAfterSeconds
    this.fields = options.fields
  }

  // Sem resposta do servidor: rede caída, DNS, CORS ou servidor desligado.
  get isOffline(): boolean {
    return this.status === 0
  }
}

type UnauthenticatedHandler = () => void

let unauthenticatedHandler: UnauthenticatedHandler | null = null

// Quem monta o roteador registra aqui o que fazer num `401 unauthenticated`: fora do tabuleiro
// redireciona ao login; no tabuleiro só marca a sessão como expirada (FR-032).
export function setUnauthenticatedHandler(handler: UnauthenticatedHandler | null): void {
  unauthenticatedHandler = handler
}

let serverClockOffsetMs = 0

// Diferença entre o relógio do servidor (cabeçalho `Date`) e o do aparelho. O servidor recusa
// `savedAt` mais de 5 minutos no futuro, então o salvamento corrige o relógio com este valor.
export function getServerClockOffsetMs(): number {
  return serverClockOffsetMs
}

export function resetServerClockOffset(): void {
  serverClockOffsetMs = 0
}

export type ApiRequestOptions = {
  method?: 'GET' | 'POST' | 'PUT'
  body?: unknown
  keepalive?: boolean
  signal?: AbortSignal
  // Chamadas de autenticação tratam o 401 por conta própria.
  skipUnauthenticatedHandler?: boolean
  fetch?: typeof fetch
}

function learnServerClock(response: Response): void {
  const header = response.headers.get('date')
  if (!header) return
  const server = Date.parse(header)
  if (Number.isNaN(server)) return
  // O cabeçalho `Date` perde os milissegundos: o meio do segundo erra no máximo 500 ms para os dois
  // lados (em vez de até 1 s sempre para trás, o que faria um salvamento recente parecer antigo).
  serverClockOffsetMs = server + 500 - Date.now()
}

async function readJson(response: Response): Promise<unknown> {
  try {
    return (await response.json()) as unknown
  } catch {
    return undefined
  }
}

// Pedidos esperando resposta, com o instante de início: o carregamento das telas usa isso para
// explicar a espera quando a API gratuita está acordando (feature 012, FR-011). Pedidos com
// `keepalive` (envio ao sair da página) não contam.
const pending = new Map<number, number>()
const pendingListeners = new Set<() => void>()
let nextPendingId = 0

function notifyPending(): void {
  for (const listener of pendingListeners) listener()
}

export function subscribePending(listener: () => void): () => void {
  pendingListeners.add(listener)
  return () => {
    pendingListeners.delete(listener)
  }
}

export function getOldestPendingStartedAt(): number | undefined {
  let oldest: number | undefined
  for (const startedAt of pending.values()) {
    if (oldest === undefined || startedAt < oldest) oldest = startedAt
  }
  return oldest
}

async function send(path: string, options: ApiRequestOptions): Promise<Response> {
  const doFetch = options.fetch ?? globalThis.fetch.bind(globalThis)
  const pendingId = options.keepalive ? undefined : nextPendingId++
  if (pendingId !== undefined) {
    pending.set(pendingId, Date.now())
    notifyPending()
  }
  let response: Response
  try {
    response = await doFetch(path, {
      method: options.method ?? 'GET',
      credentials: 'same-origin',
      headers: options.body === undefined ? undefined : { 'content-type': 'application/json' },
      body: options.body === undefined ? undefined : JSON.stringify(options.body),
      keepalive: options.keepalive,
      signal: options.signal,
    })
  } catch (cause) {
    if (cause instanceof DOMException && cause.name === 'AbortError') throw cause
    throw new ApiRequestError(0)
  } finally {
    if (pendingId !== undefined) {
      pending.delete(pendingId)
      notifyPending()
    }
  }
  learnServerClock(response)
  if (response.ok) return response

  const body = await readJson(response)
  const parsed = apiErrorSchema.safeParse(body)
  const retryAfter = Number(response.headers.get('retry-after'))
  const error = new ApiRequestError(response.status, {
    code: parsed.success ? parsed.data.error : undefined,
    fields: parsed.success ? parsed.data.fields : undefined,
    retryAfterSeconds: Number.isFinite(retryAfter) && retryAfter > 0 ? retryAfter : undefined,
  })
  if (
    response.status === 401 &&
    error.code === 'unauthenticated' &&
    !options.skipUnauthenticatedHandler
  ) {
    unauthenticatedHandler?.()
  }
  throw error
}

// Toda resposta entra como `unknown` e passa pelo schema antes de ser usada.
export async function apiRequest<T>(
  path: string,
  schema: z.ZodType<T>,
  options: ApiRequestOptions = {},
): Promise<T> {
  const response = await send(path, options)
  const body = await readJson(response)
  const parsed = schema.safeParse(body)
  if (!parsed.success) throw new ApiRequestError(response.status)
  return parsed.data
}

export async function apiRequestNoContent(
  path: string,
  options: ApiRequestOptions = {},
): Promise<void> {
  await send(path, options)
}
