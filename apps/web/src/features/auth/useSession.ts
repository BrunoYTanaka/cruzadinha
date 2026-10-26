import type { AuthResponse, User } from '@cruzadinha/shared'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useNavigate } from 'react-router'
import { getMe, login, logout } from '../../api/auth'
import { queryKeys } from '../../api/query-keys'
import { clearEnded } from '../../app/session-ended'
import { useServerReady } from '../status/useSlowServer'

// `null` é visitante (sem sessão), feature 013.
export function sessionQueryOptions() {
  return {
    queryKey: queryKeys.session,
    queryFn: getMe,
    staleTime: 5 * 60 * 1000,
  } as const
}

// Fora do portão que espera a API (cabeçalho, configurações, login), o pedido da sessão só sai com
// o servidor pronto; senão a API dormindo derrubaria a tela ou piscaria o cabeçalho (feature 032).
export function useSessionQuery() {
  const serverReady = useServerReady()
  return useQuery({ ...sessionQueryOptions(), enabled: serverReady })
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
      queryClient.clear()
      queryClient.setQueryData(queryKeys.session, null)
      void navigate('/', { replace: true })
    },
  })
}
