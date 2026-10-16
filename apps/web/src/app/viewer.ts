import type { QueryClient } from '@tanstack/react-query'
import type { LoaderFunction } from 'react-router'
import { sessionQueryOptions } from '../features/auth/useSession'

// Garante que a sessão foi consultada antes das telas (`null` = visitante, feature 013). Nenhuma
// tela exige sessão; falhas de rede ou do servidor vão para a tela de erro da rota.
export function viewerLoader(queryClient: QueryClient): LoaderFunction {
  return async () => {
    await queryClient.ensureQueryData(sessionQueryOptions())
    return null
  }
}
