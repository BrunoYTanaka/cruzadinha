import { Pill } from '../../../../shared/components/Pill/Pill'
import { STATUS_FILTERS, type StatusFilter as Filter } from '../../helpers/status-filter'
import styles from './StatusFilter.module.css'

export const FILTER_LABELS: Record<Filter, string> = {
  all: 'Todas',
  not_started: 'Não iniciadas',
  in_progress: 'Em andamento',
  completed: 'Concluídas',
}

type StatusFilterProps = {
  value: Filter
  onChange: (filter: Filter) => void
  // Dias do mês exibido por filtro (feature 053, US2).
  counts?: Record<Filter, number>
}

export function StatusFilter({ value, onChange, counts }: StatusFilterProps) {
  return (
    <div role="group" aria-label="Filtrar por status" className={styles.bar}>
      {STATUS_FILTERS.map((filter) => (
        <Pill key={filter} aria-pressed={value === filter} onClick={() => onChange(filter)}>
          {FILTER_LABELS[filter]}
          {counts ? ` (${counts[filter]})` : ''}
        </Pill>
      ))}
    </div>
  )
}
