import { healthStatusSchema } from '@cruzadinha/shared'

// Espera a API gratuita acordar antes da primeira tela (feature 012, FR-008 e FR-009). Pronto quer
// dizer: `GET /api/health` respondeu 200 com o banco no ar. O resultado vale até recarregar a
// página; se a API voltar a dormir depois, quem explica a espera é o `LoadingState`.

export const WAKE_NOTICE_DELAY_MS = 2_000
export const WAKE_TIMEOUT_MS = 90_000
export const WAKE_RETRY_MS = 2_000
export const WAKE_ATTEMPT_TIMEOUT_MS = 10_000

export class ServerWakeTimeoutError extends Error {
  constructor() {
    super('o servidor não respondeu a tempo')
    this.name = 'ServerWakeTimeoutError'
  }
}

let ready = false
const readyListeners = new Set<() => void>()

export function isServerReady(): boolean {
  return ready
}

export function subscribeServerReady(listener: () => void): () => void {
  readyListeners.add(listener)
  return () => {
    readyListeners.delete(listener)
  }
}

function markReady(): void {
  ready = true
  for (const listener of readyListeners) listener()
}

// Só para testes.
export function resetServerWake(): void {
  ready = false
}

function abortError(): DOMException {
  return new DOMException('A espera foi cancelada.', 'AbortError')
}

// Uma tentativa, com limite próprio. Qualquer coisa diferente de 200 + banco no ar conta como "não
// pronto": falha de rede, HTML de "acordando" do provedor, 503 do repasse, banco suspenso.
async function attempt(doFetch: typeof fetch, signal: AbortSignal | undefined): Promise<boolean> {
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), WAKE_ATTEMPT_TIMEOUT_MS)
  const forward = () => controller.abort()
  signal?.addEventListener('abort', forward)
  try {
    const response = await doFetch('/api/health', {
      credentials: 'same-origin',
      headers: { accept: 'application/json' },
      signal: controller.signal,
    })
    if (response.status !== 200) return false
    const body: unknown = await response.json().catch(() => undefined)
    const parsed = healthStatusSchema.safeParse(body)
    return parsed.success && parsed.data.database === 'up'
  } catch {
    return false
  } finally {
    clearTimeout(timer)
    signal?.removeEventListener('abort', forward)
  }
}

function pause(ms: number, signal: AbortSignal | undefined): Promise<void> {
  return new Promise((resolve, reject) => {
    if (signal?.aborted) {
      reject(abortError())
      return
    }
    const timer = setTimeout(() => {
      signal?.removeEventListener('abort', onAbort)
      resolve()
    }, ms)
    function onAbort() {
      clearTimeout(timer)
      reject(abortError())
    }
    signal?.addEventListener('abort', onAbort, { once: true })
  })
}

export async function waitForServer(
  options: { signal?: AbortSignal; fetch?: typeof fetch } = {},
): Promise<void> {
  if (ready) return
  const { signal } = options
  const doFetch = options.fetch ?? globalThis.fetch.bind(globalThis)
  const startedAt = Date.now()
  for (;;) {
    if (signal?.aborted) throw abortError()
    if (await attempt(doFetch, signal)) {
      markReady()
      return
    }
    if (signal?.aborted) throw abortError()
    if (Date.now() - startedAt + WAKE_RETRY_MS > WAKE_TIMEOUT_MS) throw new ServerWakeTimeoutError()
    await pause(WAKE_RETRY_MS, signal)
  }
}

// Espera o laço de `waitForServer` (rodado pelo loader pai) terminar, sem fazer pedido próprio.
// Loaders irmãos que consultam a API usam isto para não sair antes de o servidor acordar.
export function whenServerReady(signal?: AbortSignal): Promise<void> {
  if (ready) return Promise.resolve()
  return new Promise((resolve, reject) => {
    if (signal?.aborted) {
      reject(abortError())
      return
    }
    const stop = () => {
      unsubscribe()
      signal?.removeEventListener('abort', onAbort)
    }
    const unsubscribe = subscribeServerReady(() => {
      stop()
      resolve()
    })
    function onAbort() {
      stop()
      reject(abortError())
    }
    signal?.addEventListener('abort', onAbort, { once: true })
  })
}
