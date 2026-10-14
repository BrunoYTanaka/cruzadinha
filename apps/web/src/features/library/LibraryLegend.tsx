import styles from './LibraryLegend.module.css'

const ITEMS = [
  { key: 'completed', label: 'Concluído' },
  { key: 'in_progress', label: 'Em andamento' },
  { key: 'not_started', label: 'Não iniciado' },
  { key: 'fetchable', label: 'Buscar na fonte' },
  { key: 'future', label: 'Indisponível' },
] as const

export function LibraryLegend() {
  return (
    <ul className={styles.legend} aria-label="Legenda do calendário">
      {ITEMS.map((item) => (
        <li key={item.key} className={styles.item}>
          <i className={`${styles.swatch} ${styles[item.key]}`} aria-hidden="true" />
          {item.label}
        </li>
      ))}
    </ul>
  )
}
