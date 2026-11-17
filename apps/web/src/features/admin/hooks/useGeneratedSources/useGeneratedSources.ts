import type {
  DiscardGeneratedRequest,
  GeneratedSettingsRequest,
  GeneratedSourceView,
} from '@cruzadinha/shared'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  discardGeneratedPuzzle,
  fetchGeneratedSources,
  saveGeneratedSettings,
} from '../../../../shared/services/api/generated-sources/generated-sources'
import { queryKeys } from '../../../../shared/services/api/query-keys/query-keys'

// Configuração, chamadas do dia e cruzada de hoje das fontes geradas (feature 064).
export function useGeneratedSources() {
  const queryClient = useQueryClient()
  const query = useQuery({
    queryKey: queryKeys.generatedSources,
    queryFn: async (): Promise<GeneratedSourceView[]> => (await fetchGeneratedSources()).sources,
    retry: false,
    // O que a pessoa está editando não pode ser trocado por uma busca em segundo plano.
    refetchOnWindowFocus: false,
  })
  const refresh = () => queryClient.invalidateQueries({ queryKey: queryKeys.generatedSources })
  const save = useMutation({
    mutationFn: (body: GeneratedSettingsRequest) => saveGeneratedSettings(body),
    onSuccess: refresh,
  })
  const discard = useMutation({
    mutationFn: (body: DiscardGeneratedRequest) => discardGeneratedPuzzle(body),
    onSettled: refresh,
  })
  return { query, save, discard }
}
