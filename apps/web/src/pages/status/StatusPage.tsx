import { healthStatusSchema, type HealthStatus } from '@cruzadinha/shared'
import { useQuery } from '@tanstack/react-query'
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
    <main>
      <h1>Cruzadinha</h1>
      <p>Servidor: {server}</p>
      {health.isSuccess && (
        <p>Banco: {health.data.database === 'up' ? 'disponível' : 'indisponível'}</p>
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
