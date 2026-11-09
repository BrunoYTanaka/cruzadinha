import type { PuzzleSourceId } from '@cruzadinha/shared'
import { Link } from 'react-router'
import { formatElapsed, spokenElapsed } from '../../../../shared/helpers/time/time'
import { MONTH_NAMES, type CalendarDay } from '../../helpers/calendar'
import { matchesFilter, type StatusFilter } from '../../helpers/status-filter'
import styles from '../Calendar/Calendar.module.css'

// Modo de seleção (feature 058): só dias com cruzada guardada podem ser escolhidos, como botões.
export type DayPick = {
  puzzleId: string
  date: string
  source: PuzzleSourceId
  finishedMs: number | null
}

export type DaySelection = {
  selectedId: string | null
  onSelect: (pick: DayPick) => void
}

// O estado de cada dia aparece sempre por texto ou símbolo, nunca só por cor. Em calendário estreito
// (menos de 480 px) só o símbolo de concluído (✓) e de em andamento (◐) fica; o nome acessível
// continua por extenso (feature 062).
type VisibleStatus = { glyph: string; text: string }

function visibleStatus(day: CalendarDay): VisibleStatus | null {
  const { state } = day
  switch (state.kind) {
    case 'completed':
      return {
        glyph: '✓',
        text: state.finishedMs === null ? '' : ` ${formatElapsed(state.finishedMs)}`,
      }
    case 'in_progress':
      return { glyph: '◐', text: ' Em jogo' }
    case 'not_started':
      return { glyph: '', text: day.isToday ? 'Hoje' : 'Jogar' }
    case 'fetchable':
      return { glyph: '', text: 'Buscar' }
    case 'none':
      return { glyph: '', text: 'Sem cruzada' }
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
  stored,
  filter = 'all',
  selection,
}: {
  day: CalendarDay
  month: number
  source: PuzzleSourceId
  // Ids das cruzadas guardadas no aparelho (feature 041).
  stored?: ReadonlySet<string>
  // Filtro de status (feature 053): o dia fora dele vira texto sem ação.
  filter?: StatusFilter
  selection?: DaySelection
}) {
  const { state } = day
  const playable =
    state.kind === 'completed' || state.kind === 'in_progress' || state.kind === 'not_started'
  const offline = playable && stored?.has(state.puzzleId) === true
  const dimmed = !matchesFilter(state, filter)
  const done = selection && state.kind === 'completed'
  const notSavedInPicker = selection && state.kind === 'fetchable'
  const spoken = notSavedInPicker
    ? 'não guardado, não pode ser escolhido'
    : `${spokenStatus(day)}${done ? ', você já fez esta' : ''}`
  const label = `${day.isToday ? 'Hoje, ' : ''}${day.day} de ${MONTH_NAMES[month - 1] ?? ''}, ${spoken}${offline ? ', disponível sem rede' : ''}${dimmed ? ', fora do filtro' : ''}`
  const visible = visibleStatus(day)
  const status = visible && done ? { ...visible, text: `${visible.text} · já fez` } : visible
  const classes = [
    styles.day,
    styles[state.kind],
    day.isToday ? styles.today : '',
    dimmed ? styles.dimmed : '',
  ]
    .filter(Boolean)
    .join(' ')
  const content = (
    <>
      <span className={styles.number} aria-hidden="true">
        {day.day}
      </span>
      {offline ? (
        <span className={styles.offline} aria-hidden="true">
          ⤓
        </span>
      ) : null}
      {status ? (
        <small className={styles.status} aria-hidden="true">
          {status.glyph ? <span className={styles.glyph}>{status.glyph}</span> : null}
          <span className={status.glyph ? styles.statusText : undefined}>{status.text}</span>
        </small>
      ) : null}
    </>
  )

  if (dimmed) {
    return (
      <span className={classes} role="img" aria-label={label} data-date={day.date}>
        {content}
      </span>
    )
  }
  if (selection && playable) {
    const selected = selection.selectedId === state.puzzleId
    return (
      <button
        type="button"
        className={`${classes} ${selected ? styles.selected : ''}`}
        aria-label={label}
        aria-pressed={selected}
        data-date={day.date}
        onClick={() =>
          selection.onSelect({
            puzzleId: state.puzzleId,
            date: day.date,
            source,
            finishedMs: state.kind === 'completed' ? state.finishedMs : null,
          })
        }
      >
        {content}
      </button>
    )
  }
  if (state.kind === 'completed' || state.kind === 'in_progress' || state.kind === 'not_started') {
    return (
      <Link
        to={`/jogo/${state.puzzleId}`}
        className={classes}
        aria-label={label}
        data-date={day.date}
      >
        {content}
      </Link>
    )
  }
  if (state.kind === 'fetchable' && !selection) {
    return (
      <Link
        to={`/dia/${day.date}?fonte=${source}`}
        className={classes}
        aria-label={label}
        data-date={day.date}
      >
        {content}
      </Link>
    )
  }
  return (
    <span className={classes} role="img" aria-label={label} data-date={day.date}>
      {content}
    </span>
  )
}
