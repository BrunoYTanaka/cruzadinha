import { healthStatusSchema, type HealthStatus } from '@cruzadinha/shared'
import { useQuery } from '@tanstack/react-query'
import styles from './StatusPage.module.css'
import { RequiresConnection } from '../../shared/components/RequiresConnection/RequiresConnection'

async function fetchHealth(): Promise<HealthStatus> {
  const response = await fetch('/api/health')
  const body: unknown = await response.json()
  return healthStatusSchema.parse(body)
}

function Status() {
  const health = useQuery({ queryKey: ['health'], queryFn: fetchHealth })

  const server = health.isPending ? 'wait' : health.isSuccess ? 'ok' : 'bad'
  const database = health.isSuccess ? (health.data.database === 'up' ? 'ok' : 'bad') : null

  return (
    <main className={styles.page}>
      <h1 className={styles.title}>Cruzadinha</h1>
      <div className={styles.panel}>
        <Row label="Servidor" state={server} />
        {database ? <Row label="Banco" state={database} /> : null}
      </div>
    </main>
  )
}

const STATE_TEXT = { wait: '… verificando', ok: '✓ disponível', bad: '✕ indisponível' } as const

// Linha do painel (feature 062): o nome à esquerda e o selo à direita; o selo traz símbolo e texto,
// nunca só a cor.
function Row({ label, state }: { label: string; state: keyof typeof STATE_TEXT }) {
  return (
    <div role="group" aria-label={label} className={styles.row}>
      <span>{label}</span>
      <span className={styles.chip} data-state={state}>
        {STATE_TEXT[state]}
      </span>
    </div>
  )
}

export function StatusPage() {
  return (
    <RequiresConnection>
      <Status />
    </RequiresConnection>
  )
}
