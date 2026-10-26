import { z } from 'zod'

export const helpSchema = z.object({
  usage: z.object({ letters: z.number().int().min(0), words: z.number().int().min(0) }),
  marks: z.record(z.string(), z.enum(['helped', 'wrong'])),
  locked: z.array(z.string()),
})
