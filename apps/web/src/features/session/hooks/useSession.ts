import type { AuthResponse, User } from '@cruzadinha/shared'
import { useMutation, useQuery, useQueryClient, type QueryClient } from '@tanstack/react-query'
import { useEffect } from 'react'
import { useNavigate } from 'react-router'
import { getMe, login, logout } from '../../../shared/services/api/auth/auth'
import { queryKeys } from '../../../shared/services/api/query-keys/query-keys'
import { clearEnded } from '../services/session-ended'
import { clearLastUser, readLastUser, writeLastUser } from '../services/last-user/last-user'
import { sessionLost } from '../services/session-handlers'
import { useServerReady } from '../../../shared/hooks/useSlowServer/useSlowServer'

// A sessão veio do último usuário conhecido, sem perguntar ao servidor (feature 041, sem rede).
let servedOffline = false

async function fetchSession(): Promise<AuthResponse | null> {
  if (navigator.onLine === false) {
    servedOffline = true
    const user = readLastUser()
    return user ? { user } : null
  }
  servedOffline = false
  const session = await getMe()
  if (session) writeLastUser(session.user)
  else clearLastUser()
  return session
}

// Abre uma tela sem esperar o servidor (cruzada guardada, feature 041): sem sessão em cache, vale o
// último usuário conhecido até o servidor ficar pronto e confirmar. Falso quando não há como saber
// quem é a pessoa (sem cache, sem último usuário e com rede): aí a tela espera a sessão de verdade.
export function seedSessionFromLastUser(queryClient: QueryClient): boolean {
  if (queryClient.getQueryData(queryKeys.session) !== undefined) return true
  const user = readLastUser()
  if (!user && navigator.onLine !== false) return false
  queryClient.setQueryData(queryKeys.session, user ? { user } : null)
  servedOffline = true
  return true
}

// `null` é visitante (sem sessão), feature 013.
export function sessionQueryOptions() {
  return {
    queryKey: queryKeys.session,
    queryFn: fetchSession,
    staleTime: 5 * 60 * 1000,
  } as const
}

// Fora do portão que espera a API (cabeçalho, configurações, login), o pedido da sessão só sai com
// o servidor pronto; senão a API dormindo derrubaria a tela ou piscaria o cabeçalho (feature 032).
export function useSessionQuery() {
  const serverReady = useServerReady()
  const queryClient = useQueryClient()
  const query = useQuery({ ...sessionQueryOptions(), enabled: serverReady })
  const { refetch } = query
  // A sessão do início veio do último usuário conhecido: com o servidor pronto, confirma de verdade;
  // se acabou, vale o fluxo de sessão encerrada de sempre (feature 041, R4).
  useEffect(() => {
    if (!serverReady || !servedOffline) return
    servedOffline = false
    const before = queryClient.getQueryData<AuthResponse | null>(queryKeys.session)?.user
    void refetch().then((result) => {
      if (before && result.data === null) sessionLost(queryClient, window.location.pathname, before)
    })
  }, [serverReady, refetch, queryClient])
  return query
}

export type Viewer = { kind: 'guest' } | { kind: 'user'; user: User }

export function toViewer(session: AuthResponse | null): Viewer {
  return session ? { kind: 'user', user: session.user } : { kind: 'guest' }
}

// Quem está usando o site; indefinido enquanto a sessão não foi consultada.
export function useViewer(): Viewer | undefined {
  const session = useSessionQuery()
  return session.data === undefined ? undefined : toViewer(session.data)
}

export function viewerKey(viewer: Viewer): string {
  return viewer.kind === 'guest' ? 'guest' : viewer.user.id
}

export function useLoginMutation() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: login,
    onSuccess: (response) => {
      queryClient.setQueryData(queryKeys.session, response)
      writeLastUser(response.user)
      clearEnded()
    },
  })
}

// Ao sair, limpa tudo o que está em memória e volta à biblioteca como visitante, mesmo se a
// chamada falhar.
export function useLogoutMutation() {
  const queryClient = useQueryClient()
  const navigate = useNavigate()
  return useMutation({
    mutationFn: logout,
    onSettled: () => {
      clearLastUser()
      queryClient.clear()
      queryClient.setQueryData(queryKeys.session, null)
      void navigate('/', { replace: true })
    },
  })
}
