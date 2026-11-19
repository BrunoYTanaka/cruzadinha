import { z } from 'zod'
import { withKnownSources, type PuzzleSourceId } from '../puzzle/schema'

// Feature 064: fontes cujas cruzadas a coleta gera com um modelo de linguagem. O jogador nunca vê
// o modelo nem o provedor (FR-012); só o painel e a coleta sabem que a fonte é gerada.
export const generatedSourceIds = ['casa'] as const satisfies readonly PuzzleSourceId[]

export type GeneratedSourceId = (typeof generatedSourceIds)[number]

export const generatedSourceIdSchema = z.enum(generatedSourceIds)

export function isGeneratedSource(source: PuzzleSourceId): source is GeneratedSourceId {
  return (generatedSourceIds as readonly string[]).includes(source)
}

export const difficultySchema = z.enum(['easy', 'medium', 'hard'])

export type Difficulty = z.infer<typeof difficultySchema>

export const difficultyLabels = {
  easy: 'Fácil',
  medium: 'Médio',
  hard: 'Difícil',
} as const satisfies Record<Difficulty, string>

// Título da atribuição de uma cruzada gerada: é o único lugar em que a dificuldade da geração fica
// guardada. As duas funções andam juntas para a ida e a volta não divergirem (feature 066).
export function difficultyTitle(difficulty: Difficulty): string {
  return `Dificuldade: ${difficultyLabels[difficulty]}`
}

export function parseDifficultyTitle(title: string | null): Difficulty | null {
  return (
    difficultySchema.options.find((difficulty) => difficultyTitle(difficulty) === title) ?? null
  )
}

export const GENERATED_GRID_SIZE_MIN = 9
export const GENERATED_GRID_SIZE_MAX = 15
export const GENERATION_DAILY_CALLS = 3

export type GeneratedSettings = { gridSize: number; difficulty: Difficulty }

export const GENERATED_SETTINGS_DEFAULT: GeneratedSettings = { gridSize: 11, difficulty: 'medium' }

const gridSizeSchema = z
  .number()
  .int()
  .min(GENERATED_GRID_SIZE_MIN, { error: 'deve estar entre 9 e 15' })
  .max(GENERATED_GRID_SIZE_MAX, { error: 'deve estar entre 9 e 15' })

export const generatedSettingsRequestSchema = z.strictObject({
  source: generatedSourceIdSchema,
  gridSize: gridSizeSchema,
  difficulty: difficultySchema,
})

export type GeneratedSettingsRequest = z.infer<typeof generatedSettingsRequestSchema>

export const discardGeneratedRequestSchema = z.strictObject({
  source: generatedSourceIdSchema,
  puzzleId: z.uuid(),
})

export type DiscardGeneratedRequest = z.infer<typeof discardGeneratedRequestSchema>

// Respostas: tolerantes (chaves novas descartadas; fonte que o site não conhece sai da lista).
export const generatedWordSchema = z.object({
  number: z.number().int().positive(),
  direction: z.enum(['across', 'down']),
  answer: z.string(),
  clue: z.string(),
})

export const generatedSourceViewSchema = z.object({
  source: generatedSourceIdSchema,
  gridSize: z.number().int(),
  difficulty: difficultySchema,
  callsLeft: z.number().int().min(0),
  today: z
    .object({
      puzzleId: z.string(),
      size: z.number().int(),
      discardable: z.boolean(),
      blockedBy: z.enum(['progress', 'duel']).nullable(),
      // Dificuldade com que a cruzada de hoje foi gerada; null se não der para saber; ausente numa
      // API anterior (feature 066).
      difficulty: difficultySchema.nullable().optional(),
      words: z.array(generatedWordSchema),
    })
    .nullable(),
})

export type GeneratedSourceView = z.infer<typeof generatedSourceViewSchema>

export const generatedSourcesResponseSchema = z.object({
  sources: withKnownSources(z.array(generatedSourceViewSchema), (item) =>
    typeof item === 'object' && item !== null && 'source' in item ? item.source : undefined,
  ),
})

export type GeneratedSourcesResponse = z.infer<typeof generatedSourcesResponseSchema>

export const discardGeneratedResponseSchema = z.object({ discarded: z.literal(true) })
