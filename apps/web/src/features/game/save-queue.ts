import {
  saveProgressRequestSchema,
  type Progress,
  type ProgressEnvelope,
  type SaveProgressRequest,
} from '@cruzadinha/shared'
import { ApiRequestError, getServerClockOffsetMs } from '../../api/client'
import { readStorage, removeStorage, writeStorage } from '../../lib/storage'

// `local-only`: só a fila do visitante, quando o navegador não deixa guardar (feature 013, FR-009).
export type SaveState =
  'saved' | 'saving' | 'offline' | 'session-expired' | 'completed-elsewhere' | 'local-only'

export type SaveSnapshot = {
  cells: (string | null)[][]
  elapsedMs: number
  status: 'in_progress' | 'completed'
}

export type SaveFn = (
  puzzleId: string,
  body: SaveProgressRequest,
  options: { keepalive?: boolean },
) => Promise<ProgressEnvelope>

export type SaveQueueOptions = {
  puzzleId: string
  userId: string
  save: SaveFn
  now?: () => number
  serverClockOffsetMs?: () => number
  debounceMs?: number
  onProgress?: (progress: Progress | null, body: SaveProgressRequest) => void
}

export type SaveQueue = {
  getState: () => SaveState
  subscribe: (listener: () => void) => () => void
  // Agenda o salvamento com atraso (debounce); só o último estado é enviado.
  schedule: (snapshot: SaveSnapshot) => void
  // Envia já (conclusão, ou a página sendo fechada com `keepalive`).
  sendNow: (snapshot: SaveSnapshot, options?: { keepalive?: boolean }) => Promise<void>
  // Reenvia o que está pendente ou na fila local (depois do novo login, ou de voltar a rede).
  retry: () => Promise<void>
  // Corpo ainda não confirmado, guardado no aparelho.
  readOutbox: () => SaveProgressRequest | null
  dispose: () => void
}

export const DEBOUNCE_MS = 1500
const BACKOFF_MS = [1_000, 2_000, 4_000, 8_000, 16_000, 30_000]

export function outboxKey(userId: string, puzzleId: string): string {
  return `cruzadinha:outbox:${userId}:${puzzleId}`
}

// Corpo ainda não confirmado, guardado no aparelho; ignora o que estiver corrompido.
export function readOutbox(userId: string, puzzleId: string): SaveProgressRequest | null {
  const raw = readStorage(outboxKey(userId, puzzleId))
  if (raw === null) return null
  try {
    const parsed = saveProgressRequestSchema.safeParse(JSON.parse(raw) as unknown)
    return parsed.success ? parsed.data : null
  } catch {
    return null
  }
}

export function createSaveQueue(options: SaveQueueOptions): SaveQueue {
  const { puzzleId, userId, save, onProgress } = options
  const now = options.now ?? Date.now
  const offset = options.serverClockOffsetMs ?? getServerClockOffsetMs
  const debounceMs = options.debounceMs ?? DEBOUNCE_MS
  const key = outboxKey(userId, puzzleId)

  let state: SaveState = 'saved'
  const listeners = new Set<() => void>()
  let pending: SaveProgressRequest | null = null
  let inFlight: Promise<void> | null = null
  let debounceTimer: ReturnType<typeof setTimeout> | null = null
  let retryTimer: ReturnType<typeof setTimeout> | null = null
  let attempt = 0
  // Depois de `dispose`, nenhuma nova repetição é agendada até a fila voltar a ser usada.
  let stopped = false

  function setState(next: SaveState) {
    if (state === next) return
    state = next
    listeners.forEach((listener) => listener())
  }

  function stamp(snapshot: SaveSnapshot): SaveProgressRequest {
    // O servidor recusa `savedAt` mais de 5 minutos no futuro: corrige o relógio do aparelho.
    return { ...snapshot, savedAt: new Date(now() + offset()).toISOString() }
  }

  const readOutboxBody = () => readOutbox(userId, puzzleId)

  function writeOutbox(body: SaveProgressRequest) {
    writeStorage(key, JSON.stringify(body))
  }

  function clearOutboxUpTo(body: SaveProgressRequest) {
    const stored = readOutboxBody()
    if (!stored || stored.savedAt <= body.savedAt) removeStorage(key)
  }

  function clearTimers() {
    if (debounceTimer) clearTimeout(debounceTimer)
    if (retryTimer) clearTimeout(retryTimer)
    debounceTimer = null
    retryTimer = null
  }

  function scheduleRetry() {
    if (stopped || retryTimer) return
    const delay = BACKOFF_MS[Math.min(attempt, BACKOFF_MS.length - 1)] ?? 30_000
    attempt += 1
    retryTimer = setTimeout(() => {
      retryTimer = null
      void flush()
    }, delay)
  }

  async function attemptSend(
    body: SaveProgressRequest,
    keepalive: boolean,
    restamped = false,
  ): Promise<'done' | 'retry-later' | 'stop'> {
    try {
      const envelope = await save(puzzleId, body, { keepalive })
      clearOutboxUpTo(body)
      attempt = 0
      onProgress?.(envelope.progress, body)
      return 'done'
    } catch (error) {
      writeOutbox(body)
      if (!(error instanceof ApiRequestError)) {
        setState('offline')
        return 'retry-later'
      }
      if (error.status === 409 && error.code === 'progress-completed') {
        setState('completed-elsewhere')
        return 'stop'
      }
      if (error.status === 401) {
        setState('session-expired')
        return 'stop'
      }
      if (error.status === 400 && error.code === 'invalid-input' && !restamped) {
        // Pode ser o relógio do aparelho: tenta uma vez com a hora corrigida.
        const fresh = { ...body, savedAt: new Date(now() + offset()).toISOString() }
        return attemptSend(fresh, keepalive, true)
      }
      setState('offline')
      return error.status === 0 || error.status >= 500 ? 'retry-later' : 'stop'
    }
  }

  async function flush(keepalive = false): Promise<void> {
    if (inFlight) {
      // Um envio já está no ar: o que chegou nesse meio-tempo segue logo depois.
      await inFlight
      if (!pending) return
    }
    const body = pending ?? readOutboxBody()
    if (!body) {
      setState(state === 'saving' ? 'saved' : state)
      return
    }
    pending = null
    setState('saving')
    inFlight = (async () => {
      const outcome = await attemptSend(body, keepalive)
      if (outcome === 'retry-later') {
        // O corpo volta para a frente da fila, a menos que algo mais novo tenha chegado.
        pending ??= body
        scheduleRetry()
      } else if (outcome === 'done' && !pending) {
        setState('saved')
      }
    })()
    try {
      await inFlight
    } finally {
      inFlight = null
    }
    if (
      pending &&
      !stopped &&
      state !== 'session-expired' &&
      state !== 'completed-elsewhere' &&
      !retryTimer
    ) {
      await flush(keepalive)
    }
  }

  return {
    getState: () => state,
    subscribe: (listener) => {
      listeners.add(listener)
      return () => {
        listeners.delete(listener)
      }
    },
    schedule: (snapshot) => {
      stopped = false
      pending = stamp(snapshot)
      if (state === 'saved') setState('saving')
      if (state === 'session-expired' || state === 'completed-elsewhere') {
        // Sem como enviar: as letras vão para a fila local, e o jogo continua.
        writeOutbox(pending)
        return
      }
      if (debounceTimer) clearTimeout(debounceTimer)
      debounceTimer = setTimeout(() => {
        debounceTimer = null
        void flush()
      }, debounceMs)
    },
    sendNow: async (snapshot, sendOptions = {}) => {
      stopped = false
      pending = stamp(snapshot)
      if (debounceTimer) clearTimeout(debounceTimer)
      debounceTimer = null
      if (retryTimer) clearTimeout(retryTimer)
      retryTimer = null
      if (sendOptions.keepalive) writeOutbox(pending)
      if (state === 'session-expired' || state === 'completed-elsewhere') {
        writeOutbox(pending)
        return
      }
      await flush(sendOptions.keepalive ?? false)
    },
    retry: async () => {
      stopped = false
      if (state === 'session-expired') setState('saving')
      if (retryTimer) clearTimeout(retryTimer)
      retryTimer = null
      await flush()
    },
    readOutbox: readOutboxBody,
    // Só cancela os temporizadores. Não "mata" a fila: o React StrictMode monta, desmonta e monta de
    // novo, e a fila precisa seguir funcionando depois disso.
    dispose: () => {
      stopped = true
      clearTimers()
    },
  }
}
