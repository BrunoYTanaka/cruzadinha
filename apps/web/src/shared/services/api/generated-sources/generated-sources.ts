import {
  discardGeneratedResponseSchema,
  generatedSourcesResponseSchema,
  generatedSourceViewSchema,
  type DiscardGeneratedRequest,
  type GeneratedSettingsRequest,
  type GeneratedSourcesResponse,
  type GeneratedSourceView,
} from '@cruzadinha/shared'
import { apiRequest } from '../client/client'

// Fontes geradas no painel (feature 064). Quem não é admin recebe 404, nunca 401.
export function fetchGeneratedSources(): Promise<GeneratedSourcesResponse> {
  return apiRequest('/api/admin/generated', generatedSourcesResponseSchema, {
    skipUnauthenticatedHandler: true,
  })
}

export function saveGeneratedSettings(
  body: GeneratedSettingsRequest,
): Promise<GeneratedSourceView> {
  return apiRequest('/api/admin/generated/settings', generatedSourceViewSchema, {
    method: 'PUT',
    body,
    skipUnauthenticatedHandler: true,
  })
}

export function discardGeneratedPuzzle(body: DiscardGeneratedRequest): Promise<unknown> {
  return apiRequest('/api/admin/generated/discard', discardGeneratedResponseSchema, {
    method: 'POST',
    body,
    skipUnauthenticatedHandler: true,
  })
}
