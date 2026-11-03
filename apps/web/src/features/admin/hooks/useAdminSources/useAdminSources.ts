import type { AdminSource, UpdateSourcesRequest } from '@cruzadinha/shared'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  fetchAdminSources,
  saveAdminSources,
} from '../../../../shared/services/api/admin-sources/admin-sources'
import { queryKeys } from '../../../../shared/services/api/query-keys/query-keys'

// Lê a configuração das fontes (todas, inclusive as escondidas) e salva uma nova. Ao salvar, a lista
// pública é pedida de novo, para este aparelho ver o resultado (feature 060).
export function useAdminSources() {
  const queryClient = useQueryClient()
  const query = useQuery({
    queryKey: queryKeys.adminSources,
    queryFn: async (): Promise<AdminSource[]> => (await fetchAdminSources()).sources,
    retry: false,
    // O que a pessoa está editando não pode ser trocado por uma busca em segundo plano.
    refetchOnWindowFocus: false,
  })
  const save = useMutation({
    mutationFn: async (body: UpdateSourcesRequest): Promise<AdminSource[]> =>
      (await saveAdminSources(body)).sources,
    onSuccess: (sources) => {
      queryClient.setQueryData(queryKeys.adminSources, sources)
      void queryClient.invalidateQueries({ queryKey: queryKeys.sources })
    },
  })
  return { query, save }
}
