import { z } from 'zod'
import { checkGridShape, checkPuzzleRules, type RuleIssue } from './rules'

function addIssues(ctx: z.core.$RefinementCtx, issues: RuleIssue[]) {
  for (const { path, message } of issues) ctx.addIssue({ code: 'custom', path, message })
}

const positiveInt = z.number().int().positive()
const dimension = z
  .number()
  .int()
  .min(1, { error: 'deve estar entre 1 e 30' })
  .max(30, { error: 'deve estar entre 1 e 30' })

// A fonte só publica o nível diário; novos níveis entram aqui quando houver fonte para eles.
export const levelSchema = z.enum(['daily'], { error: 'deve ser daily' })

export const puzzleSourceIdSchema = z.enum(['oglobo'])

export const isoDateSchema = z.iso.date({ error: 'deve ser uma data AAAA-MM-DD válida' })

export const cellSchema = z.discriminatedUnion('kind', [
  z.strictObject({ kind: z.literal('block') }),
  z.strictObject({ kind: z.literal('open'), number: positiveInt.nullable() }),
])

export const wordSchema = z.strictObject({
  number: positiveInt,
  direction: z.enum(['across', 'down']),
  row: z.number().int().min(0),
  col: z.number().int().min(0),
  length: z.number().int().min(2, { error: 'a palavra deve ter ao menos 2 letras' }),
  clue: z.string().refine((clue) => clue.trim().length > 0, { error: 'a dica não pode ser vazia' }),
})

export const gridSchema = z
  .strictObject({
    width: dimension,
    height: dimension,
    cells: z.array(z.array(cellSchema)),
  })
  .superRefine((grid, ctx) => addIssues(ctx, checkGridShape(grid)))

export const attributionSchema = z.strictObject({
  sourceName: z.string().min(1),
  title: z.string().nullable(),
  author: z.string().nullable(),
  copyright: z.string().nullable(),
})

export const puzzleSchema = z
  .strictObject({
    source: puzzleSourceIdSchema,
    level: levelSchema,
    date: isoDateSchema,
    attribution: attributionSchema,
    grid: gridSchema,
    words: z.array(wordSchema).min(1),
  })
  .superRefine((puzzle, ctx) => addIssues(ctx, checkPuzzleRules(puzzle)))

export const solutionSchema = z.strictObject({
  cells: z.array(z.array(z.string().nullable())),
})

export const availableDateSchema = z.strictObject({
  date: isoDateSchema,
  inTheFuture: z.boolean(),
})

export type Level = z.infer<typeof levelSchema>
export type PuzzleSourceId = z.infer<typeof puzzleSourceIdSchema>
export type Cell = z.infer<typeof cellSchema>
export type Word = z.infer<typeof wordSchema>
export type Puzzle = z.infer<typeof puzzleSchema>
export type Solution = z.infer<typeof solutionSchema>
export type AvailableDate = z.infer<typeof availableDateSchema>
