import type { ReactNode } from 'react'
import styles from './AccountSection.module.css'

export { styles as sectionStyles }

type Props = { title: string; lead?: string; status?: ReactNode; children?: ReactNode }

// Seção da página da conta: título, texto, o que a pessoa preenche e um espaço fixo para o
// resultado (sem deslocar o layout, FR-014).
export function AccountSection({ title, lead, status, children }: Props) {
  return (
    <section className={styles.section}>
      <h2 className={styles.title}>{title}</h2>
      {lead ? <p className={styles.lead}>{lead}</p> : null}
      {children}
      <div className={styles.status}>{status}</div>
    </section>
  )
}
