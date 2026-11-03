import type { PuzzleSourceId } from '@cruzadinha/shared'
import { useMemo, useState } from 'react'
import { addMonths, todayInBrasilia, type YearMonth } from '../../../../shared/helpers/dates/dates'
import {
  buildMonth,
  compareMonths,
  currentMonth,
  firstNavigableMonth,
} from '../../helpers/calendar'
import type { StatusFilter } from '../../helpers/status-filter'
import { completedInMonth } from '../../helpers/today-cards'
import { useVisibleSources } from '../../../../shared/hooks/useVisibleSources/useVisibleSources'
import { libraryOf, useSourceLibraries } from '../../hooks/useSourceLibraries'
import { resolveSource } from '../../services/source-choice'
import { Calendar } from '../Calendar/Calendar'
import { type DayPick } from '../DayCell/DayCell'
import { SourceTabs } from '../SourceTabs/SourceTabs'

export type { DayPick }

// Escolha de uma cruzada já guardada para o duelo x1 (feature 058): as abas de fonte e o calendário
// em modo de seleção. Não grava a fonte lembrada do calendário.
export function DayPicker({
  selectedId,
  onSelect,
}: {
  selectedId: string | null
  onSelect: (pick: DayPick) => void
}) {
  const today = useMemo(() => todayInBrasilia(), [])
  const libraries = useSourceLibraries()
  const { sources, defaultSource, isPending } = useVisibleSources()
  const [chosen, setSource] = useState<PuzzleSourceId | null>(null)
  // A primeira fonte visível abre por padrão; uma escolha que sumiu da lista volta a ela.
  const source = resolveSource(chosen ?? defaultSource, sources)
  const [month, setMonth] = useState<YearMonth>(() => currentMonth(today))
  const [filter, setFilter] = useState<StatusFilter>('all')
  const [focusDate, setFocusDate] = useState<string | null>(null)
  const active = libraryOf(libraries, source)
  const view = useMemo(
    () => buildMonth(month, today, active.items, new Set<string>()),
    [month, today, active.items],
  )
  const first = firstNavigableMonth(today)
  const last = currentMonth(today)

  // Sem a lista de fontes não há abas: nada de fonte escondida por um instante (feature 060).
  if (isPending) return <p role="status">Carregando a biblioteca…</p>

  return (
    <div>
      <SourceTabs
        value={source}
        tabs={libraries.map((entry) => ({
          source: entry.source,
          name: entry.name,
          count: entry.query.isSuccess ? completedInMonth(entry.items, month) : null,
        }))}
        onChange={setSource}
      />
      {active.query.isPending ? (
        <p role="status">Carregando a biblioteca…</p>
      ) : active.query.isError ? (
        <p role="alert">Não foi possível carregar esta fonte agora. Tente outra ou volte depois.</p>
      ) : (
        <Calendar
          view={view}
          source={source}
          canGoPrevious={compareMonths(month, first) > 0}
          canGoNext={compareMonths(month, last) < 0}
          onPrevious={() => setMonth((current) => addMonths(current, -1))}
          onNext={() => setMonth((current) => addMonths(current, 1))}
          filter={filter}
          onFilterChange={setFilter}
          today={today}
          onJumpMonth={(next) => setMonth(next)}
          onJumpDate={(date, next) => {
            setMonth(next)
            setFocusDate(date)
          }}
          focusDate={focusDate}
          onFocused={() => setFocusDate(null)}
          selection={{ selectedId, onSelect }}
        />
      )}
    </div>
  )
}
