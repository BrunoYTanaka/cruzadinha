import { z } from 'zod'

// z.object descarta campos desconhecidos: o site anterior aceita versões novas da API (FR-025).
export const healthStatusSchema = z.object({
  status: z.literal('ok'),
  database: z.enum(['up', 'down']),
  // Versão da API (semver do package.json) e commit publicado (feature 012).
  version: z
    .string()
    .regex(/^\d+\.\d+\.\d+$/)
    .optional(),
  commit: z
    .string()
    .regex(/^[0-9a-f]{7,40}$/)
    .optional(),
})

export type HealthStatus = z.infer<typeof healthStatusSchema>
