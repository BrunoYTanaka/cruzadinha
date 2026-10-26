import type { Puzzle, ProgressCells, Solution } from '@cruzadinha/shared'
import { sql } from 'drizzle-orm'
import {
  check,
  date,
  index,
  integer,
  jsonb,
  smallint,
  pgTable,
  primaryKey,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from 'drizzle-orm/pg-core'
import { timestamps } from './columns'

const instant = (name: string) => timestamp(name, { withTimezone: true, mode: 'date' })

export const users = pgTable(
  'users',
  {
    userId: uuid('user_id').primaryKey().defaultRandom(),
    email: text('email').notNull(),
    passwordHash: text('password_hash').notNull(),
    ...timestamps,
  },
  (table) => [uniqueIndex('users_email_unique').on(table.email)],
)

export const sessions = pgTable(
  'sessions',
  {
    sessionId: uuid('session_id').primaryKey().defaultRandom(),
    tokenHash: text('token_hash').notNull().unique(),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.userId, { onDelete: 'cascade' }),
    expiresAt: instant('expires_at').notNull(),
    absoluteExpiresAt: instant('absolute_expires_at').notNull(),
    endedAt: instant('ended_at'),
    ...timestamps,
  },
  (table) => [
    index('sessions_user_id_idx').on(table.userId),
    check('sessions_expiry_within_absolute', sql`${table.expiresAt} <= ${table.absoluteExpiresAt}`),
  ],
)

export const rateLimitActions = [
  'LOGIN',
  'REGISTER',
  'PUZZLE_FETCH',
  'SETTINGS_SAVE',
  'FORGOT_PASSWORD',
  'RESEND_VERIFICATION',
  'VERIFY_TOKEN',
  'EMAIL_SENT',
  'RESET_PASSWORD',
] as const
export const rateLimitKeyTypes = ['EMAIL', 'NETWORK_ADDRESS', 'GLOBAL'] as const

export const rateLimitAttempts = pgTable(
  'rate_limit_attempts',
  {
    rateLimitAttemptId: uuid('rate_limit_attempt_id').primaryKey().defaultRandom(),
    action: text('action', { enum: rateLimitActions }).notNull(),
    keyType: text('key_type', { enum: rateLimitKeyTypes }).notNull(),
    keyValue: text('key_value').notNull(),
    ...timestamps,
  },
  (table) => [
    index('rate_limit_attempts_lookup_idx').on(
      table.action,
      table.keyType,
      table.keyValue,
      table.createdAt,
    ),
    index('rate_limit_attempts_created_at_idx').on(table.createdAt),
    check(
      'rate_limit_attempts_action_check',
      sql`${table.action} IN ('LOGIN', 'REGISTER', 'PUZZLE_FETCH', 'SETTINGS_SAVE', 'FORGOT_PASSWORD', 'RESEND_VERIFICATION', 'VERIFY_TOKEN', 'EMAIL_SENT', 'RESET_PASSWORD')`,
    ),
    check(
      'rate_limit_attempts_key_type_check',
      sql`${table.keyType} IN ('EMAIL', 'NETWORK_ADDRESS', 'GLOBAL')`,
    ),
  ],
)

export const puzzleSources = ['oglobo', 'cruzadaonline', 'cruzadasbrasil', 'clube'] as const
export const puzzleLevels = ['daily'] as const

// Cache compartilhado de puzzles: um por fonte, nível e data. `data` é a parte pública e
// `solution` fica só no servidor; os dois entram como unknown e são relidos pelo Zod.
export const puzzles = pgTable(
  'puzzles',
  {
    puzzleId: uuid('puzzle_id').primaryKey().defaultRandom(),
    source: text('source', { enum: puzzleSources }).notNull(),
    level: text('level', { enum: puzzleLevels }).notNull(),
    date: date('date', { mode: 'string' }).notNull(),
    data: jsonb('data').$type<Puzzle>().notNull(),
    solution: jsonb('solution').$type<Solution>().notNull(),
    ...timestamps,
  },
  (table) => [
    uniqueIndex('puzzles_source_level_date_unique').on(table.source, table.level, table.date),
    check(
      'puzzles_source_check',
      sql`${table.source} IN ('oglobo', 'cruzadaonline', 'cruzadasbrasil', 'clube')`,
    ),
    check('puzzles_level_check', sql`${table.level} IN ('daily')`),
  ],
)

export const progressStatuses = ['in_progress', 'completed'] as const

// Progresso individual: um registro por usuário e puzzle. `cells` são as letras do jogador
// (jsonb relido pelo Zod). `completed_at`/`finished_ms` descrevem a partida atual e são limpos no
// reinício; `best_ms`/`best_at` são o recorde e sobrevivem a ele.
export const progress = pgTable(
  'progress',
  {
    userId: uuid('user_id')
      .notNull()
      .references(() => users.userId, { onDelete: 'cascade' }),
    puzzleId: uuid('puzzle_id')
      .notNull()
      .references(() => puzzles.puzzleId, { onDelete: 'restrict' }),
    cells: jsonb('cells').$type<ProgressCells>().notNull(),
    elapsedMs: integer('elapsed_ms').notNull(),
    status: text('status', { enum: progressStatuses }).notNull(),
    savedAt: instant('saved_at').notNull(),
    completedAt: instant('completed_at'),
    finishedMs: integer('finished_ms'),
    bestMs: integer('best_ms'),
    bestAt: instant('best_at'),
    ...timestamps,
  },
  (table) => [
    primaryKey({ columns: [table.userId, table.puzzleId] }),
    index('progress_puzzle_id_idx').on(table.puzzleId),
    check('progress_elapsed_ms_check', sql`${table.elapsedMs} BETWEEN 0 AND 604800000`),
    check('progress_status_check', sql`${table.status} IN ('in_progress', 'completed')`),
    check(
      'progress_completed_pair',
      sql`(${table.status} = 'completed') = (${table.completedAt} IS NOT NULL AND ${table.finishedMs} IS NOT NULL)`,
    ),
    check('progress_best_pair', sql`(${table.bestMs} IS NULL) = (${table.bestAt} IS NULL)`),
    check(
      'progress_best_when_finished',
      sql`${table.finishedMs} IS NULL OR (${table.bestMs} IS NOT NULL AND ${table.bestMs} <= ${table.finishedMs})`,
    ),
  ],
)

// Configurações da pessoa (feature 021): uma linha por usuário. `settings` é jsonb relido pelo Zod
// campo a campo; `saved_at` é o momento da mudança no aparelho e decide qual versão vale.
export const userSettings = pgTable('user_settings', {
  userId: uuid('user_id')
    .primaryKey()
    .references(() => users.userId, { onDelete: 'cascade' }),
  settings: jsonb('settings').$type<unknown>().notNull(),
  savedAt: instant('saved_at').notNull(),
  ...timestamps,
})

// Cadastro ainda não confirmado (feature 035): vira um usuário quando o link é aberto.
export const pendingRegistrations = pgTable(
  'pending_registrations',
  {
    pendingId: uuid('pending_id').primaryKey().defaultRandom(),
    email: text('email').notNull(),
    tokenHash: text('token_hash').notNull().unique(),
    expiresAt: instant('expires_at').notNull(),
    ...timestamps,
  },
  (table) => [uniqueIndex('pending_registrations_email_unique').on(table.email)],
)

export const passwordResetTokens = pgTable(
  'password_reset_tokens',
  {
    tokenId: uuid('token_id').primaryKey().defaultRandom(),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.userId, { onDelete: 'cascade' }),
    tokenHash: text('token_hash').notNull().unique(),
    expiresAt: instant('expires_at').notNull(),
    usedAt: instant('used_at'),
    ...timestamps,
  },
  (table) => [
    index('password_reset_tokens_user_id_idx').on(table.userId),
    // No máximo um token aberto por usuário, mesmo com dois pedidos ao mesmo tempo.
    uniqueIndex('password_reset_tokens_open_user_unique')
      .on(table.userId)
      .where(sql`${table.usedAt} IS NULL`),
  ],
)

export const emailBlockReasons = ['daily_quota_exceeded', 'monthly_quota_exceeded'] as const

// Linha única: até quando o provedor de e-mail está sem cota.
export const emailSendBlock = pgTable(
  'email_send_block',
  {
    blockId: smallint('block_id').primaryKey(),
    blockedUntil: instant('blocked_until').notNull(),
    reason: text('reason', { enum: emailBlockReasons }).notNull(),
    ...timestamps,
  },
  (table) => [
    check('email_send_block_single_row', sql`${table.blockId} = 1`),
    check(
      'email_send_block_reason_check',
      sql`${table.reason} IN ('daily_quota_exceeded', 'monthly_quota_exceeded')`,
    ),
  ],
)
