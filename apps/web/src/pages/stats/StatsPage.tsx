import { StatsView, useStats } from '../../features/stats'
import { ErrorState, LoadingState } from '../../shared/components/ErrorState/ErrorState'
import { useDocumentTitle } from '../../shared/hooks/useDocumentTitle/useDocumentTitle'
import styles from './StatsPage.module.css'

export function StatsPage() {
  useDocumentTitle('Estatísticas')
  const result = useStats()
  return (
    <div className={styles.page}>
      <h1 className={styles.title}>Estatísticas</h1>
      {result.state === 'loading' ? <LoadingState /> : null}
      {result.state === 'error' ? (
        <ErrorState
          level={2}
          message="Não foi possível carregar as estatísticas agora."
          onRetry={result.retry}
        />
      ) : null}
      {result.state === 'ready' ? <StatsView stats={result.stats} guest={result.guest} /> : null}
    </div>
  )
}
