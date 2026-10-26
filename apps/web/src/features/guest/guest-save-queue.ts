import type { GuestProgress } from '../../domain/guest/guest-progress'
import type { HelpSnapshot } from '../../domain/game/reducer'
import type { SaveQueue, SaveSnapshot, SaveState } from '../../domain/game/save-types'
import type { GuestStore } from './guest-store'

export type GuestSnapshot = SaveSnapshot & { help?: HelpSnapshot | null }

export type GuestSaveQueueOptions = {
  puzzleId: string
  date: string
  store: GuestStore
  now?: () => number
  // Geração do jogo desta aba (muda em "Jogar de novo").
  game?: number
  onSaved?: (record: GuestProgress) => void
}

// Fila do visitante (feature 013): mesma interface da fila do servidor, mas grava no navegador a cada
// chamada, sem debounce e sem rede (R4). Nunca fica "sem conexão" nem "sessão expirada"; quando o
// navegador não deixa guardar, fica "local-only" e o jogo segue só nesta aba (FR-009).
export function createGuestSaveQueue(options: GuestSaveQueueOptions): SaveQueue {
  const { puzzleId, date, store, onSaved } = options
  const now = options.now ?? Date.now
  const game = options.game ?? 0
  const stateNow = (): SaveState => (store.isAvailable() ? 'saved' : 'local-only')

  // As ajudas vêm junto das letras (R7); a fila do servidor não as recebe.
  async function write(snapshot: GuestSnapshot): Promise<void> {
    const record = await store.save({
      puzzleId,
      date,
      cells: snapshot.cells,
      elapsedMs: snapshot.elapsedMs,
      status: snapshot.status,
      savedAt: new Date(now()).toISOString(),
      help: snapshot.help ?? null,
      game,
    })
    // O registro de outra geração (jogo reiniciado em outra aba) não é o desta aba.
    if (record && (record.game ?? 0) === game) onSaved?.(record)
  }

  return {
    getState: stateNow,
    subscribe: (listener) => store.subscribe(listener),
    schedule: (snapshot: GuestSnapshot) => {
      void write(snapshot)
    },
    sendNow: (snapshot: GuestSnapshot) => write(snapshot),
    retry: async () => {},
    readOutbox: () => null,
    dispose: () => {},
  }
}
