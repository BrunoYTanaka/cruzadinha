import { parseArgs } from 'node:util'
import { z } from 'zod'
import type { Database } from '../db/client'
import type { Clock } from '../lib/clock'
import type { InviteStatus } from '@cruzadinha/shared'
import { defaultRateLimits } from '../modules/rate-limit/limits'
import { createRateLimitRepository } from '../modules/rate-limit/rate-limit.repository'
import { createRateLimiter } from '../modules/rate-limit/rate-limit.service'
import { createPuzzlesService } from '../modules/puzzles/puzzles.service'
import type { PuzzleSource } from '../sources/types'
import {
  createInvitesService,
  DEFAULT_INVITE_DAYS,
  type AdminInvite,
} from '../modules/invites/invites.service'

export type CliDeps = {
  db: Database
  clock: Clock
  /** Fonte dos puzzles usada por `puzzles collect`. */
  source: PuzzleSource
  /** Dias anteriores a hoje que a coleta também busca (0 = só hoje). */
  historyDays: number
  stdout: (text: string) => void
  stderr: (text: string) => void
}

const USAGE = [
  'Uso:',
  '  invites create [--days N]   cria um convite (N inteiro positivo, padrão 7)',
  '  invites list                lista todos os convites',
  '  invites revoke <invite_id>  revoga um convite não usado',
  '  puzzles collect             guarda o puzzle do dia (e o histórico que faltar)',
].join('\n')

const daysSchema = z.string().regex(/^\d+$/).transform(Number).pipe(z.number().int().min(1))

const STATUS_LABEL: Record<InviteStatus, string> = {
  active: 'ativo',
  used: 'usado',
  expired: 'expirado',
  revoked: 'revogado',
}

class UsageError extends Error {}

function usageError(stderr: CliDeps['stderr'], message: string): number {
  stderr(`${message}\n${USAGE}\n`)
  return 2
}

async function createInvite(args: string[], deps: CliDeps): Promise<number> {
  const { values } = parseArgs({
    args,
    options: { days: { type: 'string' } },
    allowPositionals: false,
  })
  let days = DEFAULT_INVITE_DAYS
  if (values.days !== undefined) {
    const parsed = daysSchema.safeParse(values.days)
    if (!parsed.success) throw new UsageError('--days deve ser um inteiro positivo.')
    days = parsed.data
  }
  const invite = await createInvitesService(deps).createInvite({ days })
  deps.stdout(
    [
      `Convite criado: ${invite.code}`,
      `Expira em: ${invite.expiresAt.toISOString()}`,
      'Guarde o código: ele não será exibido de novo.',
      '',
    ].join('\n'),
  )
  return 0
}

function formatTable(invites: AdminInvite[]): string {
  const header = ['ID', 'CRIADOR', 'CRIADO EM', 'EXPIRA EM', 'SITUAÇÃO']
  const rows = invites.map((invite) => [
    invite.inviteId,
    invite.creatorEmail ?? 'linha de comando',
    invite.createdAt.toISOString(),
    invite.expiresAt.toISOString(),
    STATUS_LABEL[invite.status],
  ])
  const widths = header.map((title, column) =>
    Math.max(title.length, ...rows.map((row) => row[column]?.length ?? 0)),
  )
  return [header, ...rows]
    .map((row) =>
      row
        .map((cell, column) => cell.padEnd(widths[column] ?? 0))
        .join('  ')
        .trimEnd(),
    )
    .join('\n')
}

async function listInvites(args: string[], deps: CliDeps): Promise<number> {
  parseArgs({ args, options: {}, allowPositionals: false })
  const invites = await createInvitesService(deps).listAll()
  deps.stdout(invites.length === 0 ? 'Nenhum convite.\n' : `${formatTable(invites)}\n`)
  return 0
}

async function revokeInvite(args: string[], deps: CliDeps): Promise<number> {
  const { positionals } = parseArgs({ args, options: {}, allowPositionals: true })
  if (positionals.length !== 1) throw new UsageError('Informe um invite_id.')
  const inviteId = z.uuid().safeParse(positionals[0])
  if (!inviteId.success) throw new UsageError('invite_id deve ser um UUID.')

  const result = await createInvitesService(deps).revoke(inviteId.data)
  if (result === 'revoked') {
    deps.stdout(`Convite ${inviteId.data} revogado.\n`)
    return 0
  }
  deps.stderr('Nada a revogar: o convite não existe, já foi usado ou já foi revogado.\n')
  return 1
}

async function collectPuzzles(args: string[], deps: CliDeps): Promise<number> {
  parseArgs({ args, options: {}, allowPositionals: false })
  const puzzles = createPuzzlesService({
    db: deps.db,
    clock: deps.clock,
    source: deps.source,
    rateLimiter: createRateLimiter(createRateLimitRepository(deps.db)),
    limits: defaultRateLimits,
    historyDays: deps.historyDays,
  })
  const report = await puzzles.collect()

  deps.stdout(
    `Coleta de puzzles: ${report.saved.length} gravados, ${report.skipped.length} já existentes, ` +
      `${report.unavailable.length} indisponíveis, ${report.failed.length} falhas.\n`,
  )
  if (report.saved.length > 0) deps.stdout(`Gravados: ${report.saved.join(', ')}\n`)
  for (const { date, reason } of report.failed) deps.stderr(`Falhou em ${date}: ${reason}\n`)
  if (report.stoppedBy) {
    deps.stderr(
      `Interrompido por limite de uso da fonte; pendentes: ${report.pending.join(', ')}\n`,
    )
  }
  return report.failed.length > 0 || report.stoppedBy ? 1 : 0
}

export async function runCli(argv: string[], deps: CliDeps): Promise<number> {
  const [group, command, ...rest] = argv
  try {
    if (group === 'invites' && command === 'create') return await createInvite(rest, deps)
    if (group === 'invites' && command === 'list') return await listInvites(rest, deps)
    if (group === 'invites' && command === 'revoke') return await revokeInvite(rest, deps)
    if (group === 'puzzles' && command === 'collect') return await collectPuzzles(rest, deps)
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
