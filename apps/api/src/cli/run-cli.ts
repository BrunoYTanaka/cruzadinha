import { emailSchema, passwordSchema, puzzleSourceNames } from '@cruzadinha/shared'
import { parseArgs } from 'node:util'
import { describeError } from '../platform/db/errors'
import type { Database } from '../platform/db/client'
import type { Clock } from '../platform/lib/clock'
import { createAccount, createAuthService, deleteExpiredAuthRows } from '../modules/identity'
import {
  defaultRateLimits,
  createRateLimitRepository,
  createRateLimiter,
} from '../platform/rate-limit'
import { createPuzzlesService } from '../modules/puzzles'
import type { PuzzleSource } from '../sources/types'

export type CliDeps = {
  db: Database
  clock: Clock
  /** Fontes dos puzzles usadas por `puzzles collect`, na ordem da coleta. */
  sources: readonly PuzzleSource[]
  /** Dias anteriores a hoje que a coleta também busca (0 = só hoje). */
  historyDays: number
  /** Apaga as sessões mortas ao fim de `puzzles collect`; o padrão usa o serviço de autenticação. */
  purgeSessions?: () => Promise<number>
  /** Lê um segredo (a senha) sem eco no terminal, ou da entrada padrão; nunca é registrado. */
  readSecret: (prompt: string) => Promise<string>
  stdout: (text: string) => void
  stderr: (text: string) => void
}

const USAGE = [
  'Uso:',
  '  users create --email <email>   cria uma conta (a senha é pedida sem eco ou lida da entrada padrão)',
  '  puzzles collect                guarda o puzzle do dia (e o histórico que faltar)',
  '  auth cleanup                   apaga pendências, tokens e contagens de tentativas vencidos',
].join('\n')

class UsageError extends Error {}

function usageError(stderr: CliDeps['stderr'], message: string): number {
  stderr(`${message}\n${USAGE}\n`)
  return 2
}

function authService(deps: CliDeps) {
  return createAuthService({
    db: deps.db,
    clock: deps.clock,
    rateLimiter: createRateLimiter(createRateLimitRepository(deps.db)),
    limits: defaultRateLimits,
  })
}

// Conta criada pelo autor, com o cadastro aberto ou fechado (feature 013, FR-019). A senha nunca é
// argumento nem aparece na saída: só `--email` é aceito.
async function createUser(args: string[], deps: CliDeps): Promise<number> {
  const { values } = parseArgs({
    args,
    options: { email: { type: 'string' } },
    allowPositionals: false,
  })
  if (values.email === undefined) throw new UsageError('Informe --email.')
  const email = emailSchema.safeParse(values.email)
  if (!email.success) throw new UsageError('E-mail inválido.')

  const password = await deps.readSecret('Senha: ')
  if (!passwordSchema.safeParse(password).success) {
    throw new UsageError('A senha deve ter de 8 a 128 caracteres.')
  }
  const confirmation = await deps.readSecret('Confirme a senha: ')
  if (confirmation !== password) throw new UsageError('As senhas não conferem.')

  const result = await createAccount(deps.db, { email: email.data, password })
  if (!result.ok) {
    deps.stderr('Já existe uma conta com esse e-mail.\n')
    return 1
  }
  deps.stdout(`Conta criada: ${result.user.email}\n`)
  return 0
}

// Limpeza agendada de pendências de cadastro e tokens vencidos (feature 035).
async function cleanupAuth(args: string[], deps: CliDeps): Promise<number> {
  parseArgs({ args, options: {}, allowPositionals: false })
  const counts = await deleteExpiredAuthRows(deps.db, deps.clock())
  deps.stdout(
    `Limpeza: ${counts.pending} pendências, ${counts.resetTokens} tokens de recuperação, ${counts.emailChanges} trocas de e-mail, ` +
      `${counts.attempts} contagens de tentativas.\n`,
  )
  return 0
}

async function collectPuzzles(args: string[], deps: CliDeps): Promise<number> {
  parseArgs({ args, options: {}, allowPositionals: false })
  const puzzles = createPuzzlesService({
    db: deps.db,
    clock: deps.clock,
    sources: deps.sources,
    rateLimiter: createRateLimiter(createRateLimitRepository(deps.db)),
    limits: defaultRateLimits,
    historyDays: deps.historyDays,
    // Só nomes e códigos: a mensagem do erro pode trazer parâmetros de consulta ou corpo da fonte.
    onError: ({ source, date, error }) =>
      deps.stderr(
        `[${puzzleSourceNames[source]}] Erro em ${date}: ${JSON.stringify(describeError(error))}\n`,
      ),
  })
  const run = await puzzles.collect()

  let failed = false
  for (const { source, report } of run.sources) {
    const name = puzzleSourceNames[source]
    deps.stdout(
      `Coleta ${name}: ${report.saved.length} gravados, ${report.skipped.length} já existentes, ` +
        `${report.unavailable.length} indisponíveis, ${report.failed.length} falhas.\n`,
    )
    if (report.saved.length > 0) deps.stdout(`Gravados: ${report.saved.join(', ')}\n`)
    for (const { date, reason } of report.failed) {
      deps.stderr(`[${name}] Falhou em ${date}: ${reason}\n`)
    }
    if (report.stoppedBy) {
      deps.stderr(
        `[${name}] Interrompido por limite de uso da fonte; pendentes: ${report.pending.join(', ')}\n`,
      )
    }
    if (report.failed.length > 0 || report.stoppedBy) failed = true
  }

  // Depois da coleta e à parte: uma falha aqui não desfaz nem esconde o que foi gravado.
  try {
    const purge = deps.purgeSessions ?? (() => authService(deps).purgeStaleSessions())
    deps.stdout(`Sessões apagadas: ${await purge()}.\n`)
  } catch {
    // Sem detalhes: a mensagem do Drizzle traz os parâmetros da consulta.
    deps.stderr('Falha ao apagar sessões antigas.\n')
    failed = true
  }
  return failed ? 1 : 0
}

export async function runCli(argv: string[], deps: CliDeps): Promise<number> {
  const [group, command, ...rest] = argv
  try {
    if (group === 'users' && command === 'create') return await createUser(rest, deps)
    if (group === 'puzzles' && command === 'collect') return await collectPuzzles(rest, deps)
    if (group === 'auth' && command === 'cleanup') return await cleanupAuth(rest, deps)
    return usageError(deps.stderr, 'Comando desconhecido.')
  } catch (error) {
    // parseArgs lança TypeError com code ERR_PARSE_ARGS_* para opção desconhecida ou sem valor.
    const isParseError =
      error instanceof TypeError &&
      'code' in error &&
      String(error.code).startsWith('ERR_PARSE_ARGS')
    if (error instanceof UsageError || isParseError) {
      return usageError(
        deps.stderr,
        error instanceof UsageError ? error.message : 'Argumento inválido.',
      )
    }
    throw error
  }
}
