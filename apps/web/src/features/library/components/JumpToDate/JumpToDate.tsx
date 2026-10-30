import { useId, useState } from 'react'
import { monthKey, toIsoDate, type YearMonth } from '../../../../shared/helpers/dates/dates'
import { firstNavigableMonth } from '../../helpers/calendar'
import { monthOptions, periodText, resolveJump } from '../../helpers/jump'
import styles from './JumpToDate.module.css'

type JumpToDateProps = {
  today: string
  // Mês exibido na grade.
  month: YearMonth
  onJumpMonth: (month: YearMonth) => void
  onJumpDate: (date: string, month: YearMonth) => void
}

// Ir direto a um mês ou a um dia, sem navegar mês a mês (feature 054).
export function JumpToDate({ today, month, onJumpMonth, onJumpDate }: JumpToDateProps) {
  const monthId = useId()
  const dateId = useId()
  const [error, setError] = useState('')
  const options = monthOptions(today)
  const first = firstNavigableMonth(today)

  function changeDate(value: string) {
    if (value === '') return setError('')
    const result = resolveJump(value, today)
    if (result.ok) {
      setError('')
      return onJumpDate(result.date, result.month)
    }
    const period = periodText(today)
    setError(
      {
        invalid: `Data inválida. Use uma data ${period}.`,
        future: `Esta data ainda não chegou. Use uma data ${period}.`,
        'too-old': `Só há datas ${period}.`,
      }[result.reason],
    )
  }

  return (
    <div role="group" aria-label="Ir para uma data" className={styles.jump}>
      <div className={styles.fields}>
        <label htmlFor={monthId} className={styles.field}>
          Mês
          <select
            id={monthId}
            className={styles.control}
            value={monthKey(month)}
            onChange={(event) => {
              const option = options.find((item) => item.value === event.target.value)
              if (!option) return
              setError('')
              onJumpMonth({ year: option.year, month: option.month })
            }}
          >
            {options.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </label>
        <label htmlFor={dateId} className={styles.field}>
          Data
          <input
            id={dateId}
            type="date"
            className={styles.control}
            min={toIsoDate(first.year, first.month, 1)}
            max={today}
            aria-invalid={error !== ''}
            onChange={(event) => changeDate(event.target.value)}
          />
        </label>
      </div>
      <p role="alert" className={styles.error}>
        {error}
      </p>
    </div>
  )
}
