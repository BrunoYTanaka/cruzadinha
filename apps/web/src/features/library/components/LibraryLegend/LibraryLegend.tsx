import styles from './LibraryLegend.module.css'

const ITEMS = [
  { key: 'completed', label: 'Concluído', glyph: '✓' },
  { key: 'in_progress', label: 'Em andamento', glyph: '◐' },
  { key: 'not_started', label: 'Não iniciado' },
  { key: 'fetchable', label: 'Buscar na fonte' },
  { key: 'future', label: 'Indisponível' },
] as const satisfies readonly { key: string; label: string; glyph?: string }[]

export function LibraryLegend() {
  return (
    <ul className={styles.legend} aria-label="Legenda do calendário">
      {ITEMS.map((item) => (
        <li key={item.key} className={styles.item}>
          <i className={`${styles.swatch} ${styles[item.key]}`} aria-hidden="true" />
          {'glyph' in item ? (
            <span className={styles.glyph} aria-hidden="true">
              {item.glyph}
            </span>
          ) : null}
          {item.label}
        </li>
      ))}
    </ul>
  )
}
