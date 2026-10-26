import { MAX_ELAPSED_MS } from '../../../shared/helpers/time'

export type Clock = {
  elapsedMs: () => number
  start: () => void
  pause: () => void
  resume: () => void
  setHidden: (hidden: boolean) => void
  // Modal de configurações aberta (feature 021): para sem a capa de pausa e sem mexer na pausa do
  // jogador.
  setSuspended: (suspended: boolean) => void
  stop: () => void
  // Zera e volta a correr (jogar de novo).
  restart: () => void
  isRunning: () => boolean
  isPaused: () => boolean
}

type ClockOptions = {
  initialMs?: number
  now?: () => number
}

// Relógio da partida: corre enquanto a aba está visível e a pessoa não pausou; para ao ocultar a
// aba, ao pausar e ao concluir. Acumula com `performance.now()` (não deriva como contar segundos
// num `setInterval`) e respeita o teto de 7 dias do servidor.
export function createClock({
  initialMs = 0,
  now = () => performance.now(),
}: ClockOptions = {}): Clock {
  let accumulated = Math.min(Math.max(initialMs, 0), MAX_ELAPSED_MS)
  let lastTick: number | null = null
  const flags = { started: false, manual: false, hidden: false, suspended: false, stopped: false }

  const running = () =>
    flags.started && !flags.manual && !flags.hidden && !flags.suspended && !flags.stopped

  // Fecha o trecho que estava correndo, muda o estado e abre outro se for o caso.
  function change(update: () => void) {
    if (lastTick !== null) {
      accumulated += now() - lastTick
      lastTick = null
    }
    update()
    if (running()) lastTick = now()
  }

  return {
    elapsedMs: () => {
      const total = accumulated + (lastTick !== null ? now() - lastTick : 0)
      return Math.min(Math.floor(total), MAX_ELAPSED_MS)
    },
    start: () => change(() => (flags.started = true)),
    pause: () => change(() => (flags.manual = true)),
    resume: () => change(() => (flags.manual = false)),
    setHidden: (hidden) => change(() => (flags.hidden = hidden)),
    setSuspended: (suspended) => change(() => (flags.suspended = suspended)),
    stop: () => change(() => (flags.stopped = true)),
    restart: () =>
      change(() => {
        accumulated = 0
        Object.assign(flags, { started: true, manual: false, stopped: false })
      }),
    isRunning: running,
    isPaused: () => flags.manual,
  }
}
