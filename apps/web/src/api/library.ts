import {
  libraryResponseSchema,
  type LibraryResponse,
  type PuzzleSourceId,
} from '@cruzadinha/shared'
import { apiRequest } from './client'

export function getLibrary(source: PuzzleSourceId): Promise<LibraryResponse> {
  return apiRequest(`/api/library?source=${source}`, libraryResponseSchema)
}
