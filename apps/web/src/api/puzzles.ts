import { puzzleResponseSchema, type PuzzleResponse } from '@cruzadinha/shared'
import { apiRequest } from './client'

export function getPuzzleById(id: string): Promise<PuzzleResponse> {
  return apiRequest(`/api/puzzles/${encodeURIComponent(id)}`, puzzleResponseSchema)
}

// A fonte só publica o nível diário.
export function getPuzzleByDate(date: string): Promise<PuzzleResponse> {
  return apiRequest(
    `/api/puzzles?level=daily&date=${encodeURIComponent(date)}`,
    puzzleResponseSchema,
  )
}
