import { type Progress, type ProgressEnvelope, type SaveProgressRequest } from '@cruzadinha/shared'
import { ApiRequestError, getServerClockOffsetMs } from '../../../shared/services/api/client/client'
import type { SaveQueue, SaveSnapshot, SaveState } from '../../../domain/game/save-types'
import {
  applyOutboxEvent,
  BACKOFF_MS,
  readOutbox,
  readOutboxItems,
  sendPendingReset,
  writeKnownProgress,
} from '../../offline'

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

export type { SaveQueue, SaveSnapshot, SaveState }

export const DEBOUNCE_MS = 1500

export function createSaveQueue(options: SaveQueueOptions): SaveQueue {
  const { puzzleId, userId, save, onProgress } = options
  const now = options.now ?? Date.now
  const offset = options.serverClockOffsetMs ?? getServerClockOffsetMs
  const debounceMs = options.debounceMs ?? DEBOUNCE_MS

  // Pendência vinda de antes (outra abertura, sem rede): começa dizendo que ainda não foi enviada.
  let state: SaveState = readOutboxItems(userId, puzzleId).length > 0 ? 'offline' : 'saved'
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
  const resetPending = () => readOutboxItems(userId, puzzleId)[0]?.kind === 'reset'

  function writeOutbox(body: SaveProgressRequest) {
    applyOutboxEvent(userId, puzzleId, { type: 'save', body })
  }

  function clearOutboxUpTo(body: SaveProgressRequest) {
    applyOutboxEvent(userId, puzzleId, { type: 'save-confirmed', savedAt: body.savedAt })
  }

  // Um "Jogar de novo" feito sem rede vai ao servidor antes de qualquer letra nova (feature 041).
  async function settleReset(): Promise<'done' | 'retry-later' | 'stop'> {
    if (!resetPending()) return 'done'
    const outcome = await sendPendingReset(userId, puzzleId)
    if (outcome === 'stop') setState('session-expired')
    else if (outcome === 'retry-later') setState('offline')
    return outcome
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
    const reset = await settleReset()
    if (reset !== 'done') {
      writeOutbox(body)
      return reset
    }
    try {
      const envelope = await save(puzzleId, body, { keepalive })
      clearOutboxUpTo(body)
      attempt = 0
      if (envelope.progress) void writeKnownProgress(userId, envelope.progress)
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
      return error.status === 0 || error.status === 429 || error.status >= 500
        ? 'retry-later'
        : 'stop'
    }
  }

  async function flush(keepalive = false): Promise<void> {
    if (inFlight) {
      // Um envio já está no ar: o que chegou nesse meio-tempo segue logo depois.
      await inFlight
      if (!pending) return
    }
    const body = pending ?? readOutboxBody()
    if (!body && resetPending()) {
      const outcome = await settleReset()
      if (outcome === 'retry-later') scheduleRetry()
      else if (outcome === 'done') setState('saved')
      return
    }
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
