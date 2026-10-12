import { z } from 'zod'

// Formato da resposta da Agilmente (specs/001-viabilidade-fonte/decision.md). Campos extras são
// ignorados; células e dicas ficam como unknown porque o conversor separa "inesperado" de
// "não suportado".
export const agilmenteResponseSchema = z.object({
  id: z.string(),
  dates: z.array(z.unknown()).optional(),
  ipuzData: z.object({
    kind: z.array(z.string()),
    dimensions: z.object({
      width: z.number().int().positive(),
      height: z.number().int().positive(),
    }),
    puzzle: z.array(z.array(z.unknown())),
    solution: z.array(z.array(z.unknown())),
    clues: z.object({
      Across: z.array(z.unknown()),
      Down: z.array(z.unknown()),
    }),
    block: z.string().optional(),
    empty: z.union([z.string(), z.number()]).optional(),
    title: z.string().nullish(),
    author: z.string().nullish(),
    copyright: z.string().nullish(),
  }),
  fromIpuz: z.record(z.string(), z.unknown()),
})

export type AgilmenteResponse = z.infer<typeof agilmenteResponseSchema>

export const errorBodySchema = z.object({ error: z.string() })
