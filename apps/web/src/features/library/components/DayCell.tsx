import type { PuzzleSourceId } from '@cruzadinha/shared'
import { Link } from 'react-router'
import { formatElapsed, spokenElapsed } from '../../../shared/helpers/time'
import type { CalendarDay } from '../helpers/calendar'
import styles from './Calendar.module.css'

const MONTH_NAMES = [
  'janeiro',
  'fevereiro',
  'março',
  'abril',
  'maio',
  'junho',
  'julho',
  'agosto',
  'setembro',
  'outubro',
  'novembro',
  'dezembro',
]

// O estado de cada dia aparece sempre por texto, nunca só por cor.
function visibleStatus(day: CalendarDay): string | null {
  const { state } = day
  switch (state.kind) {
    case 'completed':
      return state.finishedMs === null ? '✓' : `✓ ${formatElapsed(state.finishedMs)}`
    case 'in_progress':
      return '◐ Em jogo'
    case 'not_started':
      return day.isToday ? 'Hoje' : 'Jogar'
    case 'fetchable':
      return 'Buscar'
    case 'none':
      return 'Sem cruzada'
    case 'future':
      return null
  }
}

function spokenStatus(day: CalendarDay): string {
  const { state } = day
  switch (state.kind) {
    case 'completed':
      return state.finishedMs === null
        ? 'concluído'
        : `concluído em ${spokenElapsed(state.finishedMs)}`
    case 'in_progress':
      return 'em andamento'
    case 'not_started':
      return 'não iniciado'
    case 'fetchable':
      return 'não guardado, abre para buscar na fonte'
    case 'none':
      return 'sem cruzada neste dia'
    case 'future':
      return 'indisponível'
  }
}

export function DayCell({
  day,
  month,
  source,
}: {
  day: CalendarDay
  month: number
  source: PuzzleSourceId
}) {
  const { state } = day
  const label = `${day.isToday ? 'Hoje, ' : ''}${day.day} de ${MONTH_NAMES[month - 1] ?? ''}, ${spokenStatus(day)}`
  const status = visibleStatus(day)
  const classes = [styles.day, styles[state.kind], day.isToday ? styles.today : '']
    .filter(Boolean)
    .join(' ')
  const content = (
    <>
      <span className={styles.number} aria-hidden="true">
        {day.day}
      </span>
      {status ? (
        <small className={styles.status} aria-hidden="true">
          {status}
        </small>
      ) : null}
    </>
  )

  if (state.kind === 'completed' || state.kind === 'in_progress' || state.kind === 'not_started') {
    return (
      <Link to={`/jogo/${state.puzzleId}`} className={classes} aria-label={label}>
        {content}
      </Link>
    )
  }
  if (state.kind === 'fetchable') {
    return (
      <Link to={`/dia/${day.date}?fonte=${source}`} className={classes} aria-label={label}>
        {content}
      </Link>
    )
  }
  return (
    <span className={classes} role="img" aria-label={label}>
      {content}
    </span>
  )
}

export { MONTH_NAMES }
