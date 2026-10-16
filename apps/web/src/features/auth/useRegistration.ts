import { useQuery } from '@tanstack/react-query'
import { getRegistration } from '../../api/auth'
import { queryKeys } from '../../api/query-keys'

// Se o cadastro está aberto (chave da API, feature 013). Carregando, com erro ou com uma API
// anterior que não tem a rota, vale como fechado (FR-017).
export function useRegistration(): { isOpen: boolean; isPending: boolean } {
  const query = useQuery({
    queryKey: queryKeys.registration,
    queryFn: getRegistration,
    staleTime: 60_000,
    retry: false,
  })
  return { isOpen: query.data?.open === true, isPending: query.isPending }
}
