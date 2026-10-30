import { puzzleSourceNames, type Stats } from '@cruzadinha/shared'
import { formatElapsed } from '../../../../shared/helpers/time/time'
import styles from './StatsView.module.css'

const time = (ms: number | null) => (ms === null ? '—' : formatElapsed(ms))

function days(count: number) {
  return `${count} ${count === 1 ? 'dia' : 'dias'}`
}

export function StatsView({ stats, guest }: { stats: Stats; guest: boolean }) {
  return (
    <>
      {guest ? (
        <p className={styles.note}>
          Estes números valem só para este aparelho. Entre na conta para guardá-los no servidor.
        </p>
      ) : null}
      {stats.total === 0 ? (
        <p className={styles.note}>Nenhuma cruzada concluída ainda. Que tal começar hoje?</p>
      ) : null}
      <dl className={styles.cards}>
        <div className={styles.card}>
          <dt>Sequência atual</dt>
          <dd>{days(stats.streak.current)}</dd>
        </div>
        <div className={styles.card}>
          <dt>Maior sequência</dt>
          <dd>{days(stats.streak.longest)}</dd>
        </div>
        <div className={styles.card}>
          <dt>Concluídas</dt>
          <dd>{stats.total}</dd>
        </div>
        <div className={styles.card}>
          <dt>Tempo médio</dt>
          <dd>{time(stats.averageMs)}</dd>
        </div>
      </dl>
      <h2 className={styles.heading}>Por fonte</h2>
      <table className={styles.table}>
        <thead>
          <tr>
            <th scope="col">Fonte</th>
            <th scope="col">Concluídas</th>
            <th scope="col">Tempo médio</th>
            <th scope="col">Recorde</th>
          </tr>
        </thead>
        <tbody>
          {stats.bySource.map((row) => (
            <tr key={row.source}>
              <th scope="row">{puzzleSourceNames[row.source]}</th>
              <td>{row.total}</td>
              <td>{time(row.averageMs)}</td>
              <td>{time(row.bestMs)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </>
  )
}
