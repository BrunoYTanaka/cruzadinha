import { z } from 'zod'
import { MAX_ELAPSED_MS } from '../progress/schema'
import { puzzleSourceIdSchema, withKnownSources } from '../puzzle/schema'

const countSchema = z.number().int().min(0)
const msSchema = z.number().int().min(0).max(MAX_ELAPSED_MS)

// Resposta: descarta campos desconhecidos, para o site anterior aceitar versões novas da API.
export const statsSchema = z.object({
  streak: z.object({ current: countSchema, longest: countSchema }),
  total: countSchema,
  averageMs: msSchema.nullable(),
  bySource: withKnownSources(
    z.array(
      z.object({
        source: puzzleSourceIdSchema,
        total: countSchema,
        averageMs: msSchema.nullable(),
        bestMs: msSchema.nullable(),
      }),
    ),
    (item) =>
      typeof item === 'object' && item !== null && 'source' in item ? item.source : undefined,
  ),
})

export type Stats = z.infer<typeof statsSchema>
