import { libraryResponseSchema, type LibraryResponse } from '@cruzadinha/shared'
import { apiRequest } from './client'

export function getLibrary(): Promise<LibraryResponse> {
  return apiRequest('/api/library', libraryResponseSchema)
}
