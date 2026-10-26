import {
  isoDateSchema,
  MAX_ELAPSED_MS,
  progressCellsSchema,
  progressStatusSchema,
} from '@cruzadinha/shared'
import { z } from 'zod'
import type { GuestProgress } from '../../game-logic/guest-progress'
import { helpSchema } from '../../game-logic/help-schema'

const msSchema = z.number().int().min(0).max(MAX_ELAPSED_MS)
const instantSchema = z.iso.datetime({ offset: true })

// Registro de progresso do visitante lido do IndexedDB (feature 013, data-model §1). Entra como
// `unknown`: outro formato (versão futura ou dado corrompido) é descartado, sem travar a tela. É
// estrito para nunca aceitar campos a mais, como uma solução.
export const guestProgressRecordSchema: z.ZodType<GuestProgress> = z
  .strictObject({
    v: z.literal(1),
    puzzleId: z.uuid(),
    date: isoDateSchema,
    cells: progressCellsSchema,
    elapsedMs: msSchema,
    status: progressStatusSchema,
    savedAt: instantSchema,
    completedAt: instantSchema.nullable(),
    finishedMs: msSchema.nullable(),
    bestMs: msSchema.nullable(),
    bestAt: instantSchema.nullable(),
    help: helpSchema.nullable(),
    game: z.number().int().min(0).optional(),
  })
  .refine((record) => (record.bestMs === null) === (record.bestAt === null), {
    message: 'bestMs e bestAt devem vir juntos',
    path: ['bestMs'],
  })
