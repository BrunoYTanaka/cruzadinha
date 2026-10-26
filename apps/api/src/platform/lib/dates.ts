import type { Clock } from './clock'

const DAY_MS = 24 * 60 * 60 * 1000

/** Dia de hoje em Brasília, no formato AAAA-MM-DD (o dia do puzzle é o de Brasília, não o UTC). */
export function todayInSaoPaulo(clock: Clock): string {
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Sao_Paulo' }).format(clock())
}

/** Soma dias a uma data AAAA-MM-DD pelo calendário, sem fuso. */
export function addDaysToIsoDate(date: string, days: number): string {
  const base = Date.parse(`${date}T00:00:00Z`)
  return new Date(base + days * DAY_MS).toISOString().slice(0, 10)
}

/** Hoje e os `historyDays` dias anteriores, do mais novo para o mais antigo. */
export function candidateDates(today: string, historyDays: number): string[] {
  return Array.from({ length: historyDays + 1 }, (_, offset) => addDaysToIsoDate(today, -offset))
}
