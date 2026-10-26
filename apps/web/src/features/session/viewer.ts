import type { QueryClient } from '@tanstack/react-query'
import type { LoaderFunction } from 'react-router'
import { whenServerReady } from '../../api/server-wake'
import { sessionQueryOptions } from './useSession'

// Garante que a sessão foi consultada antes das telas (`null` = visitante, feature 013). Nenhuma
// tela exige sessão; falhas de rede ou do servidor vão para a tela de erro da rota. Loaders de rotas
// aninhadas rodam em paralelo com o do pai que espera a API acordar, então a sessão só é pedida
// com o servidor pronto (feature 032).
export function viewerLoader(queryClient: QueryClient): LoaderFunction {
  return async ({ request }) => {
    await whenServerReady(request.signal)
    await queryClient.ensureQueryData(sessionQueryOptions())
    return null
  }
}
