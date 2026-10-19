import type { LibraryItem } from '@cruzadinha/shared'
import {
  addMonths,
  daysInMonth,
  firstWeekday,
  parseIsoDate,
  toIsoDate,
  type YearMonth,
} from '../../lib/dates'

// Situação de um dia no calendário (data-model.md, seção 3).
export type DayState =
  | { kind: 'completed'; finishedMs: number | null; puzzleId: string }
  | { kind: 'in_progress'; puzzleId: string }
  | { kind: 'not_started'; puzzleId: string }
  | { kind: 'future' }
  | { kind: 'fetchable' } // passado, ainda não guardado: busca na hora
  | { kind: 'none' } // a fonte já disse que não há cruzada neste dia

export type CalendarDay = {
  date: string
  day: number
  isToday: boolean
  state: DayState
}

export type MonthView = {
  year: number
  month: number
  leadingBlanks: number
  days: CalendarDay[]
}

// Até 12 meses antes de hoje: acompanha o teto de 366 itens da biblioteca, e o histórico real da
// fonte é desconhecido.
export const HISTORY_MONTHS = 12

export function firstNavigableMonth(today: string): YearMonth {
  const parsed = parseIsoDate(today)
  if (!parsed) throw new Error(`data inválida: ${today}`)
  return addMonths({ year: parsed.year, month: parsed.month }, -HISTORY_MONTHS)
}

export function currentMonth(today: string): YearMonth {
  const parsed = parseIsoDate(today)
  if (!parsed) throw new Error(`data inválida: ${today}`)
  return { year: parsed.year, month: parsed.month }
}

export function compareMonths(a: YearMonth, b: YearMonth): number {
  return a.year * 12 + a.month - (b.year * 12 + b.month)
}

// Situação de um dia, usada pelo calendário, pelos cartões de hoje e pelo atalho de conclusão
// (feature 015).
export function dayState(
  date: string,
  today: string,
  byDate: Map<string, LibraryItem>,
  noPuzzleDates: ReadonlySet<string>,
): DayState {
  const item = byDate.get(date)
  if (item) {
    if (item.status === 'completed') {
      return { kind: 'completed', finishedMs: item.finishedMs, puzzleId: item.puzzleId }
    }
    if (item.status === 'in_progress') return { kind: 'in_progress', puzzleId: item.puzzleId }
    return { kind: 'not_started', puzzleId: item.puzzleId }
  }
  if (date > today) return { kind: 'future' }
  if (noPuzzleDates.has(date)) return { kind: 'none' }
  return { kind: 'fetchable' }
}

// Domingo é o primeiro dia da semana e "hoje" é a data de Brasília (passada de fora).
export function buildMonth(
  { year, month }: YearMonth,
  today: string,
  items: readonly LibraryItem[],
  noPuzzleDates: ReadonlySet<string> = new Set(),
): MonthView {
  const byDate = new Map(items.map((item) => [item.date, item]))
  const total = daysInMonth({ year, month })
  const days: CalendarDay[] = []
  for (let day = 1; day <= total; day++) {
    const date = toIsoDate(year, month, day)
    days.push({
      date,
      day,
      isToday: date === today,
      state: dayState(date, today, byDate, noPuzzleDates),
    })
  }
  return { year, month, leadingBlanks: firstWeekday({ year, month }), days }
}
