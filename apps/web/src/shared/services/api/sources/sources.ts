import { sourcesResponseSchema, type SourcesResponse } from '@cruzadinha/shared'
import { apiRequest } from '../client/client'

// Fontes visíveis, em ordem (feature 060). Pública; uma API anterior responde 404.
export function fetchSources(): Promise<SourcesResponse> {
  return apiRequest('/api/sources', sourcesResponseSchema)
}
