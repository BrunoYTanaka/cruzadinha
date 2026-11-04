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

  const server = health.isPending
    ? 'verificando…'
    : health.isSuccess
      ? 'disponível'
      : 'indisponível'

  return (
    <main className={styles.page}>
      <h1 className={styles.title}>Cruzadinha</h1>
      <p
        className={styles.chip}
        data-state={health.isPending ? 'wait' : health.isSuccess ? 'ok' : 'bad'}
      >
        Servidor: {server}
      </p>
      {health.isSuccess && (
        <p className={styles.chip} data-state={health.data.database === 'up' ? 'ok' : 'bad'}>
          Banco: {health.data.database === 'up' ? 'disponível' : 'indisponível'}
        </p>
      )}
    </main>
  )
}

export function StatusPage() {
  return (
    <RequiresConnection>
      <Status />
    </RequiresConnection>
  )
}
