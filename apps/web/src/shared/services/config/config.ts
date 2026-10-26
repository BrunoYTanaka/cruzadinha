import { z } from 'zod'

const limit = (name: string, fallback: number) =>
  z.preprocess(
    (value) => (value === undefined || value === '' ? fallback : Number(value)),
    z
      .number({ error: `${name} deve ser um número inteiro` })
      .int({ error: `${name} deve ser um número inteiro` })
      .min(0, { error: `${name} deve estar entre 0 e 99` })
      .max(99, { error: `${name} deve estar entre 0 e 99` }),
  )

const envSchema = z.object({
  VITE_HELP_LETTER_LIMIT: limit('VITE_HELP_LETTER_LIMIT', 4),
  VITE_HELP_WORD_LIMIT: limit('VITE_HELP_WORD_LIMIT', 2),
})

export type AppConfig = { helpLimits: { letters: number; words: number } }

// Aborta com uma mensagem clara quando um valor é inválido (nunca segue com limite incorreto).
export function parseConfig(env: Record<string, unknown>): AppConfig {
  const parsed = envSchema.safeParse(env)
  if (!parsed.success) {
    const problems = parsed.error.issues.map((issue) => issue.message).join('; ')
    throw new Error(`Configuração do site inválida: ${problems}`)
  }
  return {
    helpLimits: {
      letters: parsed.data.VITE_HELP_LETTER_LIMIT,
      words: parsed.data.VITE_HELP_WORD_LIMIT,
    },
  }
}

export const config: AppConfig = parseConfig(import.meta.env)
