import { z } from 'zod'
import { isoDateSchema, levelSchema } from '../puzzle/schema'
import { MAX_ELAPSED_MS } from '../progress/schema'

// Quantos puzzles a biblioteca devolve por resposta (cerca de um ano de diários).
export const LIBRARY_LIMIT = 366

export const libraryStatusSchema = z.enum(['not_started', 'in_progress', 'completed'])

const msSchema = z.number().int().min(0).max(MAX_ELAPSED_MS)
const instantSchema = z.iso.datetime({ offset: true })

// Visão de leitura de um puzzle para o jogador: só metadados, sem grade, solução nem letras.
export const libraryItemSchema = z
  .strictObject({
    puzzleId: z.uuid(),
    date: isoDateSchema,
    level: levelSchema,
    status: libraryStatusSchema,
    elapsedMs: msSchema.nullable(),
    finishedMs: msSchema.nullable(),
    completedAt: instantSchema.nullable(),
    bestMs: msSchema.nullable(),
    bestAt: instantSchema.nullable(),
  })
  .refine((item) => (item.bestMs === null) === (item.bestAt === null), {
    message: 'bestMs e bestAt devem vir juntos',
    path: ['bestMs'],
  })

export const libraryResponseSchema = z.strictObject({ items: z.array(libraryItemSchema) })

export type LibraryStatus = z.infer<typeof libraryStatusSchema>
export type LibraryItem = z.infer<typeof libraryItemSchema>
export type LibraryResponse = z.infer<typeof libraryResponseSchema>
