import {
  adminSourcesResponseSchema,
  type AdminSourcesResponse,
  type UpdateSourcesRequest,
} from '@cruzadinha/shared'
import { apiRequest } from '../client/client'

// Administração das fontes (feature 060). Quem não é admin recebe 404, nunca 401.
export function fetchAdminSources(): Promise<AdminSourcesResponse> {
  return apiRequest('/api/admin/sources', adminSourcesResponseSchema, {
    skipUnauthenticatedHandler: true,
  })
}

export function saveAdminSources(body: UpdateSourcesRequest): Promise<AdminSourcesResponse> {
  return apiRequest('/api/admin/sources', adminSourcesResponseSchema, {
    method: 'PUT',
    body,
    skipUnauthenticatedHandler: true,
  })
}
