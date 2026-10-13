import { z } from 'zod'
import { validatePuzzleWithSolution } from './rules'
import { puzzleSchema, solutionSchema } from './schema'

// Resposta de GET /api/puzzles: o identificador, a parte pública e a solução (feature 007).
// A solução só vai a quem tem sessão e precisa ser coerente com a grade.
export const puzzleResponseSchema = z
  .strictObject({
    puzzleId: z.uuid(),
    puzzle: puzzleSchema,
    solution: solutionSchema,
  })
  .superRefine((response, ctx) => {
    const pair = validatePuzzleWithSolution(response.puzzle, response.solution)
    if (pair.success) return
    for (const { path, message } of pair.issues) {
      ctx.addIssue({ code: 'custom', path: ['solution', ...path], message })
    }
  })

export type PuzzleResponse = z.infer<typeof puzzleResponseSchema>
