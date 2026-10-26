import { puzzleResponseSchema, type PuzzleResponse, type PuzzleSourceId } from '@cruzadinha/shared'
import { apiRequest } from '../client/client'

export function getPuzzleById(id: string): Promise<PuzzleResponse> {
  return apiRequest(`/api/puzzles/${encodeURIComponent(id)}`, puzzleResponseSchema)
}

// As fontes só publicam o nível diário.
export function getPuzzleByDate(source: PuzzleSourceId, date: string): Promise<PuzzleResponse> {
  return apiRequest(
    `/api/puzzles?level=daily&date=${encodeURIComponent(date)}&source=${source}`,
    puzzleResponseSchema,
  )
}
