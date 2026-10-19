import { puzzleSourceNames, type LibraryItem, type PuzzleSourceId } from '@cruzadinha/shared'
import { monthKey, type YearMonth } from '../../lib/dates'
import { formatElapsed, spokenElapsed } from '../../lib/time'
import { dayState, type DayState } from './calendar'

// Cartão de uma fonte na seção "Hoje" (feature 015, data-model §3). O estado aparece por texto e
// o nome acessível do link junta fonte, estado falado e ação.
export type TodayCard = {
  source: PuzzleSourceId
  name: string
  kind: DayState['kind']
  status: string
  spoken: string
  action: string | null
  href: string | null
}

export function todayCard(
  source: PuzzleSourceId,
  items: readonly LibraryItem[],
  today: string,
  { down, noPuzzle }: { down: boolean; noPuzzle: boolean },
): TodayCard {
  const byDate = new Map(items.map((item) => [item.date, item]))
  const state = dayState(today, today, byDate, noPuzzle ? new Set([today]) : new Set())
  const base = { source, name: puzzleSourceNames[source], kind: state.kind }
  const elapsed = byDate.get(today)?.elapsedMs ?? null
  switch (state.kind) {
    case 'not_started':
      return {
        ...base,
        status: 'Não iniciada',
        spoken: 'não iniciada',
        action: 'Jogar',
        href: `/jogo/${state.puzzleId}`,
      }
    case 'in_progress':
      return {
        ...base,
        status: elapsed === null ? '◐ Em jogo' : `◐ Em jogo · ${formatElapsed(elapsed)}`,
        spoken: elapsed === null ? 'em andamento' : `em andamento, ${spokenElapsed(elapsed)}`,
        action: 'Continuar',
        href: `/jogo/${state.puzzleId}`,
      }
    case 'completed':
      return {
        ...base,
        status:
          state.finishedMs === null
            ? '✓ Concluída'
            : `✓ Concluída · ${formatElapsed(state.finishedMs)}`,
        spoken:
          state.finishedMs === null
            ? 'concluída'
            : `concluída em ${spokenElapsed(state.finishedMs)}`,
        action: 'Ver',
        href: `/jogo/${state.puzzleId}`,
      }
    case 'fetchable':
      // Com a fonte fora do ar, buscar agora só daria erro: o cartão avisa no lugar da ação, como o
      // aviso da fonte no calendário (feature 014).
      return down
        ? {
            ...base,
            status: 'Fonte fora do ar agora',
            spoken: 'fonte fora do ar agora',
            action: null,
            href: null,
          }
        : {
            ...base,
            status: 'Ainda não guardada',
            spoken: 'ainda não guardada',
            action: 'Jogar',
            href: `/dia/${today}?fonte=${source}`,
          }
    case 'none':
    case 'future':
      return {
        ...base,
        status: 'Sem cruzada hoje',
        spoken: 'sem cruzada hoje',
        action: null,
        href: null,
      }
  }
}

// Concluídas da fonte no mês exibido, para a aba (feature 015, data-model §4).
export function completedInMonth(items: readonly LibraryItem[], month: YearMonth): number {
  const prefix = `${monthKey(month)}-`
  return items.filter((item) => item.status === 'completed' && item.date.startsWith(prefix)).length
}

export function completedLabel(count: number): string {
  return count === 1 ? '1 concluída' : `${count} concluídas`
}
