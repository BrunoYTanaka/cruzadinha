import type { HelpSnapshot } from './reducer'

// Progresso de visitante guardado só no navegador (feature 013, data-model §1). Nunca guarda a
// solução, e-mail, senha nem token.
export type GuestProgress = {
  v: 1
  puzzleId: string
  date: string
  cells: (string | null)[][]
  elapsedMs: number
  status: 'in_progress' | 'completed'
  savedAt: string
  completedAt: string | null
  finishedMs: number | null
  bestMs: number | null
  bestAt: string | null
  help: HelpSnapshot | null
}

// O que o jogo manda gravar a cada mudança.
export type GuestSave = Pick<
  GuestProgress,
  'puzzleId' | 'date' | 'cells' | 'elapsedMs' | 'status' | 'savedAt' | 'help'
>

export type GuestDecision = { kind: 'apply'; next: GuestProgress } | { kind: 'unchanged' }

function completedFields(
  best: Pick<GuestProgress, 'bestMs' | 'bestAt'>,
  elapsedMs: number,
  now: Date,
): Pick<GuestProgress, 'completedAt' | 'finishedMs' | 'bestMs' | 'bestAt'> {
  const at = now.toISOString()
  const beatsRecord = best.bestMs === null || elapsedMs < best.bestMs
  return {
    completedAt: at,
    finishedMs: elapsedMs,
    bestMs: beatsRecord ? elapsedMs : best.bestMs,
    bestAt: beatsRecord ? at : best.bestAt,
  }
}

// Mesmas regras de `decideSave` da API (feature 008), sem o conflito entre aparelhos: o visitante
// só tem este navegador. O salvamento mais recente prevalece entre abas; uma cruzada concluída só
// volta a ser jogada por "Jogar de novo" (`decideGuestReset`).
export function decideGuestSave(
  current: GuestProgress | null,
  incoming: GuestSave,
  now: Date,
): GuestDecision {
  const base = {
    v: 1 as const,
    puzzleId: incoming.puzzleId,
    date: incoming.date,
    cells: incoming.cells,
    elapsedMs: incoming.elapsedMs,
    status: incoming.status,
    savedAt: incoming.savedAt,
    help: incoming.help,
  }

  if (!current) {
    const empty = { bestMs: null, bestAt: null }
    return {
      kind: 'apply',
      next:
        incoming.status === 'completed'
          ? { ...base, ...completedFields(empty, incoming.elapsedMs, now) }
          : { ...base, completedAt: null, finishedMs: null, ...empty },
    }
  }

  if (Date.parse(incoming.savedAt) < Date.parse(current.savedAt)) return { kind: 'unchanged' }
  if (current.status === 'completed') return { kind: 'unchanged' }

  if (incoming.status === 'in_progress') {
    return {
      kind: 'apply',
      next: {
        ...base,
        completedAt: null,
        finishedMs: null,
        bestMs: current.bestMs,
        bestAt: current.bestAt,
      },
    }
  }
  return { kind: 'apply', next: { ...base, ...completedFields(current, incoming.elapsedMs, now) } }
}

// "Jogar de novo": tudo do zero, menos o recorde.
export function decideGuestReset(current: GuestProgress, now: Date): GuestProgress {
  return {
    ...current,
    cells: current.cells.map((row) => row.map(() => null)),
    elapsedMs: 0,
    status: 'in_progress',
    savedAt: now.toISOString(),
    completedAt: null,
    finishedMs: null,
    help: null,
  }
}
