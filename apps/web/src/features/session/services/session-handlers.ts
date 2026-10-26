import type { AuthResponse } from '@cruzadinha/shared'
import type { QueryClient } from '@tanstack/react-query'
import { setUnauthenticatedHandler } from '../../../shared/services/api/client/client'
import { queryKeys } from '../../../shared/services/api/query-keys/query-keys'
import { markEnded } from './session-ended'
import { markExpired } from './session-expired'

type RouterLike = {
  state: { location: { pathname: string; search: string } }
  navigate: (to: string, options?: { replace?: boolean }) => unknown
}

// O que fazer num `401 unauthenticated` (feature 013):
// - em /login e /cadastro, nada (as telas tratam o próprio erro);
// - só quando a sessão em cache era de uma conta; para o visitante, nada: a tela trata o erro, e
//   assim não há laço de pedidos contra uma API anterior;
// - no tabuleiro (/jogo/...), só marcar a sessão como expirada: o jogo continua (FR-032 da 010);
// - nas demais telas, a pessoa vira visitante (sessão `null`), a biblioteca é buscada de novo uma vez
//   e aparece o aviso de sessão terminada (FR-013), sem ir ao login.
export function installSessionHandlers(router: RouterLike, queryClient: QueryClient): void {
  setUnauthenticatedHandler(() => {
    const { pathname } = router.state.location
    if (pathname === '/login' || pathname === '/cadastro') return
    const user = queryClient.getQueryData<AuthResponse | null>(queryKeys.session)?.user
    if (!user) return
    if (pathname.startsWith('/jogo/')) {
      markExpired(user)
      return
    }
    queryClient.setQueryData(queryKeys.session, null)
    void queryClient.invalidateQueries({ queryKey: queryKeys.libraryAll })
    markEnded()
  })
}
