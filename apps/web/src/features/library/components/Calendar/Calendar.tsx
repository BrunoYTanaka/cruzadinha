import type { PuzzleSourceId } from '@cruzadinha/shared'
import { Fragment, type ReactNode } from 'react'
import { Button } from '../../../../shared/components/Button/Button'
import type { MonthView } from '../../helpers/calendar'
import styles from './Calendar.module.css'
import { DayCell, MONTH_NAMES } from '../DayCell/DayCell'

const WEEKDAYS = [
  { short: 'dom', full: 'domingo' },
  { short: 'seg', full: 'segunda-feira' },
  { short: 'ter', full: 'terça-feira' },
  { short: 'qua', full: 'quarta-feira' },
  { short: 'qui', full: 'quinta-feira' },
  { short: 'sex', full: 'sexta-feira' },
  { short: 'sáb', full: 'sábado' },
]

type CalendarProps = {
  view: MonthView
  // Fonte escolhida: o dia buscável abre a busca nela (feature 014).
  source: PuzzleSourceId
  canGoPrevious: boolean
  canGoNext: boolean
  onPrevious: () => void
  onNext: () => void
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
  resizeHandle,
}: CalendarProps) {
  const title = `${MONTH_NAMES[view.month - 1] ?? ''} de ${view.year}`
  const cells: (number | null)[] = [
    ...Array.from({ length: view.leadingBlanks }, () => null),
    ...view.days.map((_, index) => index),
  ]
  while (cells.length % 7 !== 0) cells.push(null)
  const weeks: (number | null)[][] = []
  for (let start = 0; start < cells.length; start += 7) weeks.push(cells.slice(start, start + 7))

  return (
    // Painel da aba de fonte escolhida: o nome é o da aba e o mês entra como descrição (feature 015).
    <section
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
                      <DayCell day={view.days[dayIndex]!} month={view.month} source={source} />
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
