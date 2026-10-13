import type { Puzzle, Solution } from '@cruzadinha/shared'
import { sql } from 'drizzle-orm'
import {
  check,
  date,
  index,
  jsonb,
  pgTable,
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

export const puzzleSources = ['oglobo'] as const
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
    check('puzzles_source_check', sql`${table.source} IN ('oglobo')`),
    check('puzzles_level_check', sql`${table.level} IN ('daily')`),
  ],
)
