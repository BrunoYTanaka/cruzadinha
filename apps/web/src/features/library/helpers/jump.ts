import {
  addMonths,
  monthKey,
  parseIsoDate,
  type YearMonth,
} from '../../../shared/helpers/dates/dates'
import { compareMonths, currentMonth, firstNavigableMonth, MONTH_NAMES } from './calendar'

export type JumpResult =
  | { ok: true; month: YearMonth; date: string }
  | { ok: false; reason: 'invalid' | 'future' | 'too-old' }

export type MonthOption = YearMonth & { value: string; label: string }

function monthLabel({ year, month }: YearMonth): string {
  return `${MONTH_NAMES[month - 1] ?? ''} de ${year}`
}

// Datas aceitas: do primeiro mês navegável até hoje (os limites de "Anterior" e "Próximo").
export function resolveJump(input: string, today: string): JumpResult {
  const parsed = parseIsoDate(input)
  if (!parsed) return { ok: false, reason: 'invalid' }
  if (input > today) return { ok: false, reason: 'future' }
  const month = { year: parsed.year, month: parsed.month }
  if (compareMonths(month, firstNavigableMonth(today)) < 0) return { ok: false, reason: 'too-old' }
  return { ok: true, month, date: input }
}

export function periodText(today: string): string {
  return `de ${monthLabel(firstNavigableMonth(today))} até hoje`
}

function capitalize(text: string): string {
  return text.charAt(0).toUpperCase() + text.slice(1)
}

// Do mês atual ao mais antigo. O rótulo abre com maiúscula (é item de lista); as mensagens seguem em
// minúscula, no meio da frase.
export function monthOptions(today: string): MonthOption[] {
  const first = firstNavigableMonth(today)
  const options: MonthOption[] = []
  for (let m = currentMonth(today); compareMonths(m, first) >= 0; m = addMonths(m, -1)) {
    options.push({ ...m, value: monthKey(m), label: capitalize(monthLabel(m)) })
  }
  return options
}
