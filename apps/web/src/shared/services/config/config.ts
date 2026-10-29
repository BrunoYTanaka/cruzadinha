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
  // Chave pública do Turnstile (feature 049); vazia vale como ausente.
  VITE_TURNSTILE_SITE_KEY: z.preprocess(
    (value) => (typeof value === 'string' && value.trim() === '' ? undefined : value),
    z
      .string({ error: 'VITE_TURNSTILE_SITE_KEY deve ser um texto' })
      .trim()
      .max(128, { error: 'VITE_TURNSTILE_SITE_KEY deve ter no máximo 128 caracteres' })
      .optional(),
  ),
})

export type AppConfig = {
  helpLimits: { letters: number; words: number }
  turnstileSiteKey: string | undefined
}

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
    turnstileSiteKey: parsed.data.VITE_TURNSTILE_SITE_KEY,
  }
}

export const config: AppConfig = parseConfig(import.meta.env)
