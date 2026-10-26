import type { SaveProgressRequest } from '@cruzadinha/shared'

// `local-only`: só a fila do visitante, quando o navegador não deixa guardar (feature 013, FR-009).
export type SaveState =
  'saved' | 'saving' | 'offline' | 'session-expired' | 'completed-elsewhere' | 'local-only'

export type SaveSnapshot = {
  cells: (string | null)[][]
  elapsedMs: number
  status: 'in_progress' | 'completed'
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
