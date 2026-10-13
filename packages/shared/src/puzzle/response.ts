import { z } from 'zod'
import { puzzleSchema } from './schema'

// Resposta de GET /api/puzzles: o puzzle público e o identificador. Nunca tem a solução.
export const puzzleResponseSchema = z.strictObject({
  puzzleId: z.uuid(),
  puzzle: puzzleSchema,
})

export type PuzzleResponse = z.infer<typeof puzzleResponseSchema>
