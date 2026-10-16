import { useRevalidator, useRouteError } from 'react-router'
import { ApiRequestError } from '../api/client'
import { ServerWakeTimeoutError } from '../api/server-wake'
import { ServerWake } from '../features/status/ServerWake'
import { ErrorState } from './ErrorState'

// Tela de erro das rotas: falha de rede ou do servidor ao carregar a guarda, por exemplo.
export function RouteError() {
  const error = useRouteError()
  const revalidator = useRevalidator()
  if (error instanceof ServerWakeTimeoutError) {
    // A revalidação não mostra o fallback do roteador: a própria tela volta a explicar a espera.
    if (revalidator.state === 'loading') return <ServerWake immediate focusOnMount />
    return (
      <ErrorState
        title="Não foi possível falar com o servidor."
        message="O servidor não respondeu em 90 segundos."
        onRetry={() => void revalidator.revalidate()}
      />
    )
  }
  const offline = error instanceof ApiRequestError && error.isOffline
  return (
    <ErrorState
      title={offline ? 'Sem conexão' : 'Algo deu errado'}
      message={
        offline
          ? 'Não foi possível falar com o servidor. Confira a conexão.'
          : 'Não foi possível carregar a página. Tente de novo.'
      }
      onRetry={() => void revalidator.revalidate()}
    />
  )
}
