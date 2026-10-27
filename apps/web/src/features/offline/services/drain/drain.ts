import { ApiRequestError } from '../../../../shared/services/api/client/client'
import {
  getProgress,
  resetProgress,
  saveProgress,
} from '../../../../shared/services/api/progress/progress'
import { writeKnownProgress } from '../offline-store/offline-store'
import { applyOutboxEvent, listOutboxes, readOutboxItems } from '../outbox/outbox'

export const BACKOFF_MS = [1_000, 2_000, 4_000, 8_000, 16_000, 30_000]
const LOCK_NAME = 'cruzadinha:outbox-drain'

// `done`: nada mais a enviar neste passo; `retry-later`: rede ou servidor falharam, tentar de novo;
// `stop`: a sessão acabou, as pendências ficam como estão.
export type DrainOutcome = 'done' | 'retry-later' | 'stop'

function failure(error: unknown): DrainOutcome | 'discard' {
  if (!(error instanceof ApiRequestError)) return 'retry-later'
  if (error.status === 401) return 'stop'
  return error.status === 0 || error.status === 429 || error.status >= 500
    ? 'retry-later'
    : 'discard'
}

// Envia o "Jogar de novo" pendente (se for o primeiro item). Antes, lê o servidor: progresso ou
// conclusão mais novos que o reinício (feitos em outro aparelho) nunca são apagados.
export async function sendPendingReset(userId: string, puzzleId: string): Promise<DrainOutcome> {
  const first = readOutboxItems(userId, puzzleId)[0]
  if (first?.kind !== 'reset') return 'done'
  try {
    const { progress: server } = await getProgress(puzzleId)
    if (server && server.savedAt > first.at) {
      applyOutboxEvent(userId, puzzleId, { type: 'server-progress', savedAt: server.savedAt })
      await writeKnownProgress(userId, server)
      return 'done'
    }
    const { progress } = await resetProgress(puzzleId)
    applyOutboxEvent(userId, puzzleId, { type: 'reset-confirmed' })
    if (progress) await writeKnownProgress(userId, progress)
    return 'done'
  } catch (error) {
    const outcome = failure(error)
    if (outcome !== 'discard') return outcome
    applyOutboxEvent(userId, puzzleId, { type: 'reset-confirmed' })
    return 'done'
  }
}

async function sendPendingSave(userId: string, puzzleId: string): Promise<DrainOutcome> {
  const item = readOutboxItems(userId, puzzleId).find((entry) => entry.kind === 'save')
  if (item?.kind !== 'save') return 'done'
  try {
    const { progress } = await saveProgress(puzzleId, item.body)
    applyOutboxEvent(userId, puzzleId, { type: 'save-confirmed', savedAt: item.body.savedAt })
    if (progress) await writeKnownProgress(userId, progress)
    return 'done'
  } catch (error) {
    const outcome = failure(error)
    if (outcome !== 'discard') return outcome
    // Recusado de vez (ex.: já concluída em outro aparelho): não adianta insistir.
    applyOutboxEvent(userId, puzzleId, { type: 'save-confirmed', savedAt: item.body.savedAt })
    return 'done'
  }
}

type DrainOptions = {
  // A cruzada aberta nesta aba tem a própria fila de salvamento.
  skipPuzzleId?: string | null
  sleep?: (ms: number) => Promise<void>
}

async function drainPuzzle(
  userId: string,
  puzzleId: string,
  sleep: (ms: number) => Promise<void>,
): Promise<DrainOutcome> {
  for (let attempt = 0; ; attempt += 1) {
    let outcome = await sendPendingReset(userId, puzzleId)
    if (outcome === 'done') outcome = await sendPendingSave(userId, puzzleId)
    if (outcome !== 'retry-later') return outcome
    const wait = BACKOFF_MS[attempt]
    if (wait === undefined) return outcome
    await sleep(wait)
  }
}

async function drainAll(userId: string, options: DrainOptions): Promise<void> {
  const sleep = options.sleep ?? ((ms: number) => new Promise<void>((r) => setTimeout(r, ms)))
  const mine = listOutboxes()
    .filter((owner) => owner.userId === userId && owner.puzzleId !== options.skipPuzzleId)
    .map((owner) => ({
      puzzleId: owner.puzzleId,
      first: readOutboxItems(userId, owner.puzzleId).map((i) =>
        i.kind === 'save' ? i.body.savedAt : i.at,
      )[0],
    }))
    .sort((a, b) => (a.first ?? '').localeCompare(b.first ?? ''))
  for (const { puzzleId } of mine) {
    if ((await drainPuzzle(userId, puzzleId, sleep)) !== 'done') return
  }
}

// Esvazia as pendências da conta, fora do jogo. Uma aba por vez (Web Locks); sem a API de locks,
// roda direto: o servidor aceita o reenvio e os eventos do outbox são idempotentes.
export async function drainOutboxes(userId: string, options: DrainOptions = {}): Promise<void> {
  if (!navigator.locks) return drainAll(userId, options)
  await navigator.locks.request(LOCK_NAME, { ifAvailable: true }, async (lock) => {
    if (lock) await drainAll(userId, options)
  })
}
