import type { Puzzle, ProgressCells, Solution } from '@cruzadinha/shared'
import { sql } from 'drizzle-orm'
import {
  check,
  date,
  index,
  integer,
  jsonb,
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

export const invites = pgTable(
  'invites',
  {
    inviteId: uuid('invite_id').primaryKey().defaultRandom(),
    codeHash: text('code_hash').notNull().unique(),
    createdByUserId: uuid('created_by_user_id').references(() => users.userId),
    usedByUserId: uuid('used_by_user_id')
      .unique()
      .references(() => users.userId),
    expiresAt: instant('expires_at').notNull(),
    usedAt: instant('used_at'),
    revokedAt: instant('revoked_at'),
    ...timestamps,
  },
  (table) => [
    index('invites_created_by_user_id_idx').on(table.createdByUserId),
    check('invites_used_pair', sql`(${table.usedAt} IS NULL) = (${table.usedByUserId} IS NULL)`),
    check(
      'invites_not_used_and_revoked',
      sql`NOT (${table.usedAt} IS NOT NULL AND ${table.revokedAt} IS NOT NULL)`,
    ),
  ],
)

export const rateLimitActions = ['LOGIN', 'REGISTER', 'INVITE_CREATE', 'PUZZLE_FETCH'] as const
export const rateLimitKeyTypes = ['EMAIL', 'NETWORK_ADDRESS'] as const

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
      sql`${table.action} IN ('LOGIN', 'REGISTER', 'INVITE_CREATE', 'PUZZLE_FETCH')`,
    ),
    check(
      'rate_limit_attempts_key_type_check',
      sql`${table.keyType} IN ('EMAIL', 'NETWORK_ADDRESS')`,
    ),
  ],
)

export const puzzleSources = ['oglobo', 'cruzadaonline'] as const
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
    check('puzzles_source_check', sql`${table.source} IN ('oglobo', 'cruzadaonline')`),
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
