import type { AuthResponse } from '@cruzadinha/shared'
import type { QueryClient } from '@tanstack/react-query'
import { setUnauthenticatedHandler } from '../api/client'
import { queryKeys } from '../api/query-keys'
import { buildLoginPath } from '../features/auth/redirect'
import { markExpired } from './session-expired'

type RouterLike = {
  state: { location: { pathname: string; search: string } }
  navigate: (to: string, options?: { replace?: boolean }) => unknown
}

// O que fazer num `401 unauthenticated`:
// - em /login e /cadastro, nada (as telas tratam o próprio erro);
// - no tabuleiro (/jogo/...), só marcar a sessão como expirada: o jogo continua (FR-032);
// - nas demais telas, limpar a sessão em cache e ir ao login levando o endereço de origem.
export function installSessionHandlers(router: RouterLike, queryClient: QueryClient): void {
  setUnauthenticatedHandler(() => {
    const { pathname, search } = router.state.location
    if (pathname === '/login' || pathname === '/cadastro') return
    if (pathname.startsWith('/jogo/')) {
      markExpired(queryClient.getQueryData<AuthResponse>(queryKeys.session)?.user ?? null)
      return
    }
    queryClient.removeQueries({ queryKey: queryKeys.session })
    void router.navigate(buildLoginPath(pathname + search), { replace: true })
  })
}
