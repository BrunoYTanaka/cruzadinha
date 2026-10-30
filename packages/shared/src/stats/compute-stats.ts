import { puzzleSourceIdSchema, type PuzzleSourceId } from '../puzzle/schema'
import type { Stats } from './schema'

// Uma linha de progresso, só com o que as estatísticas precisam (nunca letras nem solução).
export type StatsRow = {
  source: PuzzleSourceId
  status: 'in_progress' | 'completed'
  finishedMs: number | null
  completedAt: string | null
  bestMs: number | null
}

const DAY_MS = 86_400_000
// Dia no fuso de Brasília, como o resto do site; `en-CA` formata como AAAA-MM-DD.
const brasiliaDay = new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Sao_Paulo' })

const dayNumber = (instant: Date) => Date.parse(`${brasiliaDay.format(instant)}T00:00:00Z`) / DAY_MS

function streaks(days: number[], today: number) {
  const sorted = [...new Set(days)].sort((a, b) => a - b)
  let longest = 0
  let run = 0
  sorted.forEach((day, i) => {
    run = i > 0 && day === sorted[i - 1]! + 1 ? run + 1 : 1
    longest = Math.max(longest, run)
  })
  // A corrida atual vale se termina hoje ou ontem (o dia de hoje ainda não acabou).
  const last = sorted.at(-1)
  const current = last !== undefined && last >= today - 1 ? run : 0
  return { current, longest }
}

const average = (values: number[]) =>
  values.length ? Math.round(values.reduce((a, b) => a + b, 0) / values.length) : null

export function computeStats(rows: StatsRow[], now: Date): Stats {
  const completed = rows.filter(
    (r) => r.status === 'completed' && r.finishedMs !== null && r.completedAt !== null,
  )
  const days = completed.map((r) => dayNumber(new Date(r.completedAt!)))
  const times = (list: StatsRow[]) => list.map((r) => r.finishedMs!)
  return {
    streak: streaks(days, dayNumber(now)),
    total: completed.length,
    averageMs: average(times(completed)),
    bySource: puzzleSourceIdSchema.options.map((source) => {
      const done = completed.filter((r) => r.source === source)
      const bests = rows
        .filter((r) => r.source === source && r.bestMs !== null)
        .map((r) => r.bestMs!)
      return {
        source,
        total: done.length,
        averageMs: average(times(done)),
        bestMs: bests.length ? Math.min(...bests) : null,
      }
    }),
  }
}
