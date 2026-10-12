import { z } from 'zod'

const postgresUrl = /^postgres(ql)?:\/\//

const envSchema = z.object({
  NODE_ENV: z
    .enum(['development', 'test', 'production'], {
      error: 'deve ser development, test ou production',
    })
    .default('development'),
  HOST: z
    .string({ error: 'deve ser um texto' })
    .min(1, { error: 'não pode ser vazio' })
    .default('0.0.0.0'),
  PORT: z.coerce
    .number({ error: 'deve ser um inteiro de 1 a 65535' })
    .int({ error: 'deve ser um inteiro de 1 a 65535' })
    .min(1, { error: 'deve ser um inteiro de 1 a 65535' })
    .max(65535, { error: 'deve ser um inteiro de 1 a 65535' })
    .default(3000),
  LOG_LEVEL: z
    .enum(['fatal', 'error', 'warn', 'info', 'debug', 'trace'], {
      error: 'deve ser fatal, error, warn, info, debug ou trace',
    })
    .default('info'),
  DATABASE_URL: z
    .string({ error: 'obrigatória' })
    .refine((value) => postgresUrl.test(value) && URL.canParse(value), {
      error: 'deve ser uma URL postgres:// ou postgresql://',
    }),
})

export type ServerConfig = Readonly<{
  nodeEnv: 'development' | 'test' | 'production'
  host: string
  port: number
  logLevel: 'fatal' | 'error' | 'warn' | 'info' | 'debug' | 'trace'
  databaseUrl: string
}>

export function loadConfig(env: Record<string, string | undefined>): ServerConfig {
  const result = envSchema.safeParse(env)
  if (!result.success) {
    const lines = result.error.issues.map((issue) => `${String(issue.path[0])}: ${issue.message}`)
    throw new Error(`Configuração inválida:\n${lines.join('\n')}`)
  }
  const { NODE_ENV, HOST, PORT, LOG_LEVEL, DATABASE_URL } = result.data
  return Object.freeze({
    nodeEnv: NODE_ENV,
    host: HOST,
    port: PORT,
    logLevel: LOG_LEVEL,
    databaseUrl: DATABASE_URL,
  })
}
