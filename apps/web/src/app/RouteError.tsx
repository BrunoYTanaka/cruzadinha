import { useRevalidator, useRouteError } from 'react-router'
import { ApiRequestError } from '../api/client'
import { ErrorState } from './ErrorState'

// Tela de erro das rotas: falha de rede ou do servidor ao carregar a guarda, por exemplo.
export function RouteError() {
  const error = useRouteError()
  const revalidator = useRevalidator()
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
