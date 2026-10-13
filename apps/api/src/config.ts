import { emailSchema, passwordSchema } from '@cruzadinha/shared'
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
  TRUST_PROXY_HOPS: z.coerce
    .number({ error: 'deve ser um inteiro de 0 a 10' })
    .int({ error: 'deve ser um inteiro de 0 a 10' })
    .min(0, { error: 'deve ser um inteiro de 0 a 10' })
    .max(10, { error: 'deve ser um inteiro de 0 a 10' })
    .default(0),
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
  trustProxyHops: number
}>

export function loadConfig(env: Record<string, string | undefined>): ServerConfig {
  const result = envSchema.safeParse(env)
  if (!result.success) {
    const lines = result.error.issues.map((issue) => `${String(issue.path[0])}: ${issue.message}`)
    throw new Error(`Configuração inválida:\n${lines.join('\n')}`)
  }
  const { NODE_ENV, HOST, PORT, LOG_LEVEL, DATABASE_URL, TRUST_PROXY_HOPS } = result.data
  return Object.freeze({
    nodeEnv: NODE_ENV,
    host: HOST,
    port: PORT,
    logLevel: LOG_LEVEL,
    databaseUrl: DATABASE_URL,
    trustProxyHops: TRUST_PROXY_HOPS,
  })
}

// Seed de desenvolvimento (FR-033): reaproveita as regras do cadastro, com mensagens em português.
const seedSchema = z.object({
  NODE_ENV: envSchema.shape.NODE_ENV,
  SEED_USER_EMAIL: z
    .string({ error: 'obrigatória' })
    .refine((value) => emailSchema.safeParse(value).success, {
      error: 'deve ser um e-mail válido',
    })
    .transform((value) => emailSchema.parse(value)),
  SEED_USER_PASSWORD: z
    .string({ error: 'obrigatória' })
    .refine((value) => passwordSchema.safeParse(value).success, {
      error: 'deve ter de 8 a 128 caracteres',
    }),
})

export type SeedConfig = Readonly<{
  nodeEnv: ServerConfig['nodeEnv']
  email: string
  password: string
}>

export function loadSeedConfig(env: Record<string, string | undefined>): SeedConfig {
  const result = seedSchema.safeParse(env)
  if (!result.success) {
    const lines = result.error.issues.map((issue) => `${String(issue.path[0])}: ${issue.message}`)
    throw new Error(`Configuração do seed inválida:\n${lines.join('\n')}`)
  }
  const { NODE_ENV, SEED_USER_EMAIL, SEED_USER_PASSWORD } = result.data
  return Object.freeze({ nodeEnv: NODE_ENV, email: SEED_USER_EMAIL, password: SEED_USER_PASSWORD })
}
