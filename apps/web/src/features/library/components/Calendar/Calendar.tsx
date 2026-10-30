import type { PuzzleSourceId } from '@cruzadinha/shared'
import { Fragment, useEffect, useRef, type ReactNode } from 'react'
import type { YearMonth } from '../../../../shared/helpers/dates/dates'
import { Button } from '../../../../shared/components/Button/Button'
import { MONTH_NAMES, type MonthView } from '../../helpers/calendar'
import { countByFilter, type StatusFilter as Filter } from '../../helpers/status-filter'
import styles from './Calendar.module.css'
import { useOfflinePuzzleIds } from '../../../offline'
import { DayCell } from '../DayCell/DayCell'
import { JumpToDate } from '../JumpToDate/JumpToDate'
import { StatusFilter } from '../StatusFilter/StatusFilter'

const WEEKDAYS = [
  { short: 'dom', full: 'domingo' },
  { short: 'seg', full: 'segunda-feira' },
  { short: 'ter', full: 'terça-feira' },
  { short: 'qua', full: 'quarta-feira' },
  { short: 'qui', full: 'quinta-feira' },
  { short: 'sex', full: 'sexta-feira' },
  { short: 'sáb', full: 'sábado' },
]

const FILTER_NOUNS: Record<Exclude<Filter, 'all'>, [string, string]> = {
  not_started: ['dia não iniciado', 'dias não iniciados'],
  in_progress: ['dia em andamento', 'dias em andamento'],
  completed: ['dia concluído', 'dias concluídos'],
}

// Anuncia a troca de filtro (região de status) e o filtro sem dias no mês.
function filterMessage(filter: Exclude<Filter, 'all'>, count: number): string {
  if (count === 0) return 'Nenhum dia neste mês com esse status.'
  return `${count} ${FILTER_NOUNS[filter][count === 1 ? 0 : 1]}`
}

type CalendarProps = {
  view: MonthView
  // Fonte escolhida: o dia buscável abre a busca nela (feature 014).
  source: PuzzleSourceId
  canGoPrevious: boolean
  canGoNext: boolean
  onPrevious: () => void
  onNext: () => void
  // Filtro de status (feature 053): estado da página, vale por mês e por fonte.
  filter: Filter
  onFilterChange: (filter: Filter) => void
  // Pular para um mês ou dia (feature 054): `focusDate` é um pedido de foco de uma vez só.
  today: string
  onJumpMonth: (month: YearMonth) => void
  onJumpDate: (date: string, month: YearMonth) => void
  focusDate: string | null
  onFocused: () => void
  // Computador: alça de redimensionar presa à borda direita do mês.
  resizeHandle?: ReactNode
}

export function Calendar({
  view,
  source,
  canGoPrevious,
  canGoNext,
  onPrevious,
  onNext,
  filter,
  onFilterChange,
  today,
  onJumpMonth,
  onJumpDate,
  focusDate,
  onFocused,
  resizeHandle,
}: CalendarProps) {
  const sectionRef = useRef<HTMLElement>(null)
  // Só o dia que é link recebe foco; um dia apagado só mostra o mês. O pedido sempre é limpo.
  useEffect(() => {
    if (focusDate === null) return
    const link = sectionRef.current?.querySelector<HTMLAnchorElement>(`a[data-date="${focusDate}"]`)
    link?.focus()
    onFocused()
  }, [focusDate, view.year, view.month, onFocused])
  const stored = useOfflinePuzzleIds()
  const title = `${MONTH_NAMES[view.month - 1] ?? ''} de ${view.year}`
  const cells: (number | null)[] = [
    ...Array.from({ length: view.leadingBlanks }, () => null),
    ...view.days.map((_, index) => index),
  ]
  while (cells.length % 7 !== 0) cells.push(null)
  const weeks: (number | null)[][] = []
  for (let start = 0; start < cells.length; start += 7) weeks.push(cells.slice(start, start + 7))

  const counts = countByFilter(view.days)
  const filterInfo = filter === 'all' ? '' : filterMessage(filter, counts[filter])

  return (
    // Painel da aba de fonte escolhida: o nome é o da aba e o mês entra como descrição (feature 015).
    <section
      ref={sectionRef}
      id="source-panel"
      role="tabpanel"
      className={styles.month}
      aria-labelledby={`source-tab-${source}`}
      aria-describedby="calendar-title"
    >
      <div className={styles.head}>
        <Button
          className={styles.nav}
          onClick={onPrevious}
          disabled={!canGoPrevious}
          aria-label="Mês anterior"
        >
          ‹
        </Button>
        <h2 id="calendar-title" className={styles.title} aria-live="polite">
          {title}
        </h2>
        <Button
          className={styles.nav}
          onClick={onNext}
          disabled={!canGoNext}
          aria-label="Próximo mês"
        >
          ›
        </Button>
      </div>
      <JumpToDate
        today={today}
        month={{ year: view.year, month: view.month }}
        onJumpMonth={onJumpMonth}
        onJumpDate={onJumpDate}
      />
      <StatusFilter value={filter} onChange={onFilterChange} counts={counts} />
      <p role="status" className={styles.statusInfo}>
        {filterInfo}
      </p>
      <table className={styles.table}>
        <caption className={styles.caption}>Cruzadas de {title}</caption>
        <thead>
          <tr>
            {WEEKDAYS.map((weekday) => (
              <th key={weekday.full} scope="col" className={styles.weekday}>
                <abbr title={weekday.full}>{weekday.short}</abbr>
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {weeks.map((week, weekIndex) => (
            <tr key={weekIndex}>
              {week.map((dayIndex, cellIndex) => (
                <Fragment key={cellIndex}>
                  {dayIndex === null ? (
                    <td className={styles.blank} />
                  ) : (
                    <td className={styles.cell}>
                      <DayCell
                        day={view.days[dayIndex]!}
                        month={view.month}
                        source={source}
                        stored={stored}
                        filter={filter}
                      />
                    </td>
                  )}
                </Fragment>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
      {resizeHandle}
    </section>
  )
}
