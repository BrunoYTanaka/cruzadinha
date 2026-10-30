import type { CalendarDay, DayState } from './calendar'

// Filtro de status do calendário (feature 053): só lê o `DayState`, não guarda nada.
export type StatusFilter = 'all' | 'not_started' | 'in_progress' | 'completed'

export const STATUS_FILTERS: readonly StatusFilter[] = [
  'all',
  'not_started',
  'in_progress',
  'completed',
]

// `all` não apaga nada; os demais deixam ativo só o dia com aquele status.
export function matchesFilter(state: DayState, filter: StatusFilter): boolean {
  return filter === 'all' || state.kind === filter
}

// Só dias com cruzada guardada entram; `fetchable`, `none` e `future` nunca são contados.
export function countByFilter(days: readonly CalendarDay[]): Record<StatusFilter, number> {
  const counts = { all: 0, not_started: 0, in_progress: 0, completed: 0 }
  for (const { state } of days) {
    if (
      state.kind === 'completed' ||
      state.kind === 'in_progress' ||
      state.kind === 'not_started'
    ) {
      counts[state.kind] += 1
      counts.all += 1
    }
  }
  return counts
}
