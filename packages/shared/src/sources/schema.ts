import { z } from 'zod'
import { puzzleSourceIdSchema, type PuzzleSourceId } from '../puzzle/schema'

// Resposta pública: só as fontes visíveis, em ordem. Tolerante a chaves novas (site mais antigo).
export const sourcesResponseSchema = z.object({
  sources: z.array(puzzleSourceIdSchema).min(1),
})

export type SourcesResponse = z.infer<typeof sourcesResponseSchema>

export const adminSourceSchema = z.object({
  id: puzzleSourceIdSchema,
  visible: z.boolean(),
  position: z.number().int().min(0),
})

export type AdminSource = z.infer<typeof adminSourceSchema>

export const adminSourcesResponseSchema = z.object({
  sources: z.array(adminSourceSchema),
})

export type AdminSourcesResponse = z.infer<typeof adminSourcesResponseSchema>

// Cada fonte conhecida exatamente uma vez; a ordem do vetor é a ordem salva.
export const updateSourcesRequestSchema = z
  .strictObject({
    sources: z.array(z.strictObject({ id: puzzleSourceIdSchema, visible: z.boolean() })),
  })
  .refine(
    ({ sources }) =>
      sources.length === puzzleSourceIdSchema.options.length &&
      new Set(sources.map((source) => source.id)).size === sources.length,
    { path: ['sources'], error: 'deve listar cada fonte exatamente uma vez' },
  )

export type UpdateSourcesRequest = z.infer<typeof updateSourcesRequestSchema>

export type SourceRow = { id: string; visible: boolean; position: number }

const KNOWN: readonly string[] = puzzleSourceIdSchema.options

// Ids visíveis por `position`. Fonte do código sem linha entra visível no fim, na ordem padrão;
// linha de fonte que o código não conhece é ignorada.
export function resolveVisibleSources(rows: readonly SourceRow[]): PuzzleSourceId[] {
  const known = rows.filter((row) => KNOWN.includes(row.id))
  const saved = new Set(known.map((row) => row.id))
  const ordered = [...known].sort((a, b) => a.position - b.position)
  const missing = puzzleSourceIdSchema.options.filter((id) => !saved.has(id))
  return [
    ...ordered.filter((row) => row.visible).map((row) => puzzleSourceIdSchema.parse(row.id)),
    ...missing,
  ]
}
