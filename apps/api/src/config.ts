import { emailSchema, passwordSchema } from '@cruzadinha/shared'
import { z } from 'zod'

const postgresUrl = /^postgres(ql)?:\/\//

const commitSchema = z.preprocess(
  (value) => (value === '' ? undefined : value),
  z
    .string()
    .regex(/^[0-9a-f]{7,40}$/, { error: 'deve ser um SHA de 7 a 40 caracteres hexadecimais' })
    .optional(),
)

// Texto vazio vale como ausente (o GitHub Actions e o Render passam '' para o que não existe).
const emptyAsUndefined = (value: unknown) => (value === '' ? undefined : value)

const intInRange = (min: number, max: number, fallback: number) =>
  z.preprocess(
    emptyAsUndefined,
    z.coerce
      .number({ error: `deve ser um inteiro de ${min} a ${max}` })
      .int({ error: `deve ser um inteiro de ${min} a ${max}` })
      .min(min, { error: `deve ser um inteiro de ${min} a ${max}` })
      .max(max, { error: `deve ser um inteiro de ${min} a ${max}` })
      .default(fallback),
  )

// `Nome <endereco@dominio>` ou só o endereço.
const mailFromPattern = /^(?:[^<>\r\n]+<[^<>\s@]+@[^<>\s@]+>|[^<>\s@]+@[^<>\s@]+)$/

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
  // Dias anteriores a hoje que `puzzles collect` também busca. O limite real de histórico da
  // fonte é desconhecido. Texto vazio vale como ausente (o GitHub Actions passa '' para uma
  // variável que não existe, e z.coerce.number() o converteria em 0).
  COLLECT_HISTORY_DAYS: z.preprocess(
    (value) => (value === '' ? undefined : value),
    z.coerce
      .number({ error: 'deve ser um inteiro de 0 a 365' })
      .int({ error: 'deve ser um inteiro de 0 a 365' })
      .min(0, { error: 'deve ser um inteiro de 0 a 365' })
      .max(365, { error: 'deve ser um inteiro de 0 a 365' })
      .default(31),
  ),
  // Segredo que prova que o pedido passou pelo repasse do site (feature 012). Vazio vale como
  // ausente: sem ele a API aceita pedidos diretos, como no desenvolvimento e nos testes.
  PROXY_SECRET: z.preprocess(
    (value) => (value === '' ? undefined : value),
    z
      .string({ error: 'deve ter de 32 a 256 caracteres' })
      .min(32, { error: 'deve ter de 32 a 256 caracteres' })
      .max(256, { error: 'deve ter de 32 a 256 caracteres' })
      .optional(),
  ),
  // Cadastro aberto pelo site e pela API (feature 013); desligado por padrão. Texto vazio vale como
  // ausente. Só aceita "true" ou "false", para um erro de digitação não abrir o cadastro.
  REGISTRATION_ENABLED: z.preprocess(
    (value) => (value === '' ? undefined : value),
    z.enum(['true', 'false'], { error: 'deve ser true ou false' }).default('false'),
  ),
  // E-mail de confirmação e de recuperação de senha pelo Resend (feature 035). Tudo opcional: sem
  // a chave, a produção responde `email-unavailable` e o desenvolvimento escreve o link no log.
  RESEND_API_KEY: z.preprocess(
    emptyAsUndefined,
    z.string({ error: 'deve ser um texto' }).min(1).max(512).optional(),
  ),
  MAIL_FROM: z.preprocess(
    emptyAsUndefined,
    z
      .string({ error: 'deve ser um e-mail ou Nome <e-mail>' })
      .max(254)
      .regex(mailFromPattern, { error: 'deve ser um e-mail ou Nome <e-mail>' })
      .optional(),
  ),
  APP_BASE_URL: z.preprocess(
    emptyAsUndefined,
    z
      .string({ error: 'deve ser uma URL sem barra final' })
      .refine((value) => URL.canParse(value) && !value.endsWith('/'), {
        error: 'deve ser uma URL sem barra final',
      })
      .optional(),
  ),
  EMAIL_RESEND_INTERVAL_SECONDS: intInRange(30, 3600, 60),
  EMAIL_PER_ADDRESS_DAILY_MAX: intInRange(1, 20, 5),
  EMAIL_DAILY_CEILING: intInRange(1, 99, 90),
  EMAIL_RECOVERY_RESERVE: intInRange(0, 98, 20),
  // Commit publicado, mostrado no /api/health. No Render vem de RENDER_GIT_COMMIT.
  RELEASE_COMMIT: commitSchema,
  RENDER_GIT_COMMIT: commitSchema,
  DATABASE_URL: z
    .string({ error: 'obrigatória' })
    .refine((value) => postgresUrl.test(value) && URL.canParse(value), {
      error: 'deve ser uma URL postgres:// ou postgresql://',
    }),
})

export type EmailConfig = Readonly<{
  apiKey: string | undefined
  from: string | undefined
  baseUrl: string | undefined
  resendIntervalSeconds: number
  perAddressDailyMax: number
  dailyCeiling: number
  recoveryReserve: number
}>

export type ServerConfig = Readonly<{
  nodeEnv: 'development' | 'test' | 'production'
  host: string
  port: number
  logLevel: 'fatal' | 'error' | 'warn' | 'info' | 'debug' | 'trace'
  databaseUrl: string
  trustProxyHops: number
  collectHistoryDays: number
  proxySecret: string | undefined
  releaseCommit: string | undefined
  // Cadastro aberto (feature 013); desligado por padrão.
  registrationEnabled: boolean
  email: EmailConfig
}>

export function loadConfig(env: Record<string, string | undefined>): ServerConfig {
  const result = envSchema.safeParse(env)
  if (!result.success) {
    const lines = result.error.issues.map((issue) => `${String(issue.path[0])}: ${issue.message}`)
    throw new Error(`Configuração inválida:\n${lines.join('\n')}`)
  }
  const mailProblems = checkMail(result.data)
  if (mailProblems.length > 0) {
    throw new Error(`Configuração inválida:\n${mailProblems.join('\n')}`)
  }
  const {
    NODE_ENV,
    HOST,
    PORT,
    LOG_LEVEL,
    DATABASE_URL,
    TRUST_PROXY_HOPS,
    COLLECT_HISTORY_DAYS,
    PROXY_SECRET,
    RELEASE_COMMIT,
    RENDER_GIT_COMMIT,
    REGISTRATION_ENABLED,
    RESEND_API_KEY,
    MAIL_FROM,
    APP_BASE_URL,
    EMAIL_RESEND_INTERVAL_SECONDS,
    EMAIL_PER_ADDRESS_DAILY_MAX,
    EMAIL_DAILY_CEILING,
    EMAIL_RECOVERY_RESERVE,
  } = result.data
  return Object.freeze({
    nodeEnv: NODE_ENV,
    host: HOST,
    port: PORT,
    logLevel: LOG_LEVEL,
    databaseUrl: DATABASE_URL,
    trustProxyHops: TRUST_PROXY_HOPS,
    collectHistoryDays: COLLECT_HISTORY_DAYS,
    proxySecret: PROXY_SECRET,
    releaseCommit: RELEASE_COMMIT ?? RENDER_GIT_COMMIT,
    registrationEnabled: REGISTRATION_ENABLED === 'true',
    email: Object.freeze({
      apiKey: RESEND_API_KEY,
      from: MAIL_FROM,
      // Só o desenvolvimento e os testes têm um endereço padrão, para o link do log funcionar.
      baseUrl: APP_BASE_URL ?? (NODE_ENV === 'production' ? undefined : 'http://localhost:5173'),
      resendIntervalSeconds: EMAIL_RESEND_INTERVAL_SECONDS,
      perAddressDailyMax: EMAIL_PER_ADDRESS_DAILY_MAX,
      dailyCeiling: EMAIL_DAILY_CEILING,
      recoveryReserve: EMAIL_RECOVERY_RESERVE,
    }),
  })
}

// Combinações que cada variável sozinha não pega.
function checkMail(env: z.infer<typeof envSchema>): string[] {
  const problems: string[] = []
  if (env.EMAIL_RECOVERY_RESERVE >= env.EMAIL_DAILY_CEILING) {
    problems.push('EMAIL_RECOVERY_RESERVE: deve ser menor que EMAIL_DAILY_CEILING')
  }
  if (env.RESEND_API_KEY) {
    if (!env.MAIL_FROM) problems.push('MAIL_FROM: obrigatória com RESEND_API_KEY')
    if (!env.APP_BASE_URL) problems.push('APP_BASE_URL: obrigatória com RESEND_API_KEY')
  }
  if (env.APP_BASE_URL) {
    const url = new URL(env.APP_BASE_URL)
    const protocolOk =
      url.protocol === 'https:' || (url.protocol === 'http:' && env.NODE_ENV !== 'production')
    if (!protocolOk) problems.push('APP_BASE_URL: deve usar https (http só fora de produção)')
  }
  return problems
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
