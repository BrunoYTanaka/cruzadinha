import type { QueryClient } from '@tanstack/react-query'
import { redirect, type LoaderFunction } from 'react-router'
import { ApiRequestError } from '../api/client'
import { buildLoginPath } from '../features/auth/redirect'
import { sessionQueryOptions } from '../features/auth/useSession'

// Garante a sessão antes de mostrar uma rota protegida. Sem sessão, vai ao login levando o
// endereço de origem; qualquer outra falha (rede, servidor) vai para a tela de erro da rota.
export function requireSessionLoader(queryClient: QueryClient): LoaderFunction {
  return async ({ request }) => {
    try {
      await queryClient.ensureQueryData(sessionQueryOptions())
      return null
    } catch (error) {
      if (error instanceof ApiRequestError && error.status === 401) {
        const url = new URL(request.url)
        throw redirect(buildLoginPath(url.pathname + url.search))
      }
      throw error
    }
  }
}
