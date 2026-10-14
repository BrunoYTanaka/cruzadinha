import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useNavigate } from 'react-router'
import { getMe, login, logout, register } from '../../api/auth'
import { queryKeys } from '../../api/query-keys'

export function sessionQueryOptions() {
  return { queryKey: queryKeys.session, queryFn: getMe, staleTime: 5 * 60 * 1000 } as const
}

export function useSessionQuery() {
  return useQuery(sessionQueryOptions())
}

export function useLoginMutation() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: login,
    onSuccess: (response) => queryClient.setQueryData(queryKeys.session, response),
  })
}

export function useRegisterMutation() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: register,
    onSuccess: (response) => queryClient.setQueryData(queryKeys.session, response),
  })
}

// Ao sair, limpa tudo o que está em memória e volta ao login, mesmo se a chamada falhar.
export function useLogoutMutation() {
  const queryClient = useQueryClient()
  const navigate = useNavigate()
  return useMutation({
    mutationFn: logout,
    onSettled: () => {
      queryClient.clear()
      void navigate('/login', { replace: true })
    },
  })
}
