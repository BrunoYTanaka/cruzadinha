import { useQuery } from '@tanstack/react-query'
import { ApiRequestError } from '../../../shared/services/api/client/client'
import { getDuelState } from '../services/duel-api'

export const duelStateKey = (linkToken: string) => ['duel', linkToken] as const

const WAITING_POLL_MS = 5000

// Estado do duelo para quem participa. Consulta de 5 em 5 s só enquanto espera o oponente (aba
// visível); quem está jogando não precisa. Um 404 com código é "não participo" e não se repete.
export function useDuelState(linkToken: string, participantToken: string | null | undefined) {
  return useQuery({
    queryKey: duelStateKey(linkToken),
    queryFn: () => getDuelState({ linkToken, ...(participantToken ? { participantToken } : {}) }),
    enabled: participantToken !== undefined,
    retry: (count, error) =>
      !(error instanceof ApiRequestError && error.status >= 400 && error.status < 500) && count < 2,
    refetchInterval: (query) => {
      const view = query.state.data?.duel
      if (!view || (view.status !== 'open' && view.status !== 'running')) return false
      return view.myStatus === 'playing' ? false : WAITING_POLL_MS
    },
    refetchIntervalInBackground: false,
  })
}
