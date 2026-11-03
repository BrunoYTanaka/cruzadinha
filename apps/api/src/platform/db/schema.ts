import type { Puzzle, ProgressCells, Solution } from '@cruzadinha/shared'
import { sql } from 'drizzle-orm'
import {
  boolean,
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
    // Feature 060: papel de administração; só a CLI do autor altera.
    isAdmin: boolean('is_admin').notNull().default(false),
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
  'PROGRESS_SAVE',
  'PASSWORD_CONFIRM',
  'CHANGE_EMAIL',
  'DUEL_CREATE',
  'DUEL_LOOKUP',
  'DUEL_MINE',
] as const
export const rateLimitKeyTypes = ['EMAIL', 'NETWORK_ADDRESS', 'GLOBAL', 'USER'] as const

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
      sql`${table.action} IN ('LOGIN', 'REGISTER', 'PUZZLE_FETCH', 'SETTINGS_SAVE', 'FORGOT_PASSWORD', 'RESEND_VERIFICATION', 'VERIFY_TOKEN', 'EMAIL_SENT', 'RESET_PASSWORD', 'PROGRESS_SAVE', 'PASSWORD_CONFIRM', 'CHANGE_EMAIL', 'DUEL_CREATE', 'DUEL_LOOKUP', 'DUEL_MINE')`,
    ),
    check(
      'rate_limit_attempts_key_type_check',
      sql`${table.keyType} IN ('EMAIL', 'NETWORK_ADDRESS', 'GLOBAL', 'USER')`,
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

// Pedido de troca de e-mail ainda não confirmado: no máximo um por conta (feature 042).
export const emailChangeRequests = pgTable(
  'email_change_requests',
  {
    requestId: uuid('request_id').primaryKey().defaultRandom(),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.userId, { onDelete: 'cascade' }),
    newEmail: text('new_email').notNull(),
    tokenHash: text('token_hash').notNull().unique(),
    expiresAt: instant('expires_at').notNull(),
    ...timestamps,
  },
  (table) => [uniqueIndex('email_change_requests_user_unique').on(table.userId)],
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

export const duelStates = ['open', 'running', 'finished', 'cancelled'] as const
export const duelHelpModes = ['free', 'forbidden', 'penalty'] as const
export const duelOutcomes = ['creator', 'opponent', 'tie'] as const
export const duelOutcomeReasons = ['time', 'forfeit', 'timeout', 'walkover', 'declined'] as const
export const duelRoles = ['creator', 'opponent'] as const
export const duelEndReasons = ['completed', 'forfeit', 'timeout'] as const

// Duelo x1 (feature 058). Os instantes de regra vêm do Clock da aplicação, nunca do now() do banco.
export const duels = pgTable(
  'duels',
  {
    duelId: uuid('duel_id').primaryKey().defaultRandom(),
    puzzleId: uuid('puzzle_id')
      .notNull()
      .references(() => puzzles.puzzleId, { onDelete: 'restrict' }),
    linkToken: text('link_token').notNull().unique(),
    code: text('code').notNull(),
    state: text('state', { enum: duelStates }).notNull(),
    helpMode: text('help_mode', { enum: duelHelpModes }).notNull(),
    helpPenaltyMs: integer('help_penalty_ms'),
    maxMs: integer('max_ms'),
    startDeadlineAt: instant('start_deadline_at').notNull(),
    outcome: text('outcome', { enum: duelOutcomes }),
    outcomeReason: text('outcome_reason', { enum: duelOutcomeReasons }),
    finishedAt: instant('finished_at'),
    ...timestamps,
  },
  (table) => [
    // O código só precisa ser único entre duelos abertos: só eles são encontrados por ele.
    uniqueIndex('duels_open_code_unique')
      .on(table.code)
      .where(sql`${table.state} = 'open'`),
    index('duels_state_deadline_idx').on(table.state, table.startDeadlineAt),
    index('duels_puzzle_id_idx').on(table.puzzleId),
    check('duels_state_check', sql`${table.state} IN ('open', 'running', 'finished', 'cancelled')`),
    check('duels_help_mode_check', sql`${table.helpMode} IN ('free', 'forbidden', 'penalty')`),
    check(
      'duels_help_penalty_check',
      sql`(${table.helpMode} = 'penalty') = (${table.helpPenaltyMs} IS NOT NULL AND ${table.helpPenaltyMs} > 0)`,
    ),
    check(
      'duels_max_ms_check',
      sql`${table.maxMs} IS NULL OR ${table.maxMs} BETWEEN 60000 AND 7200000`,
    ),
    check(
      'duels_outcome_check',
      sql`${table.outcome} IS NULL OR ${table.outcome} IN ('creator', 'opponent', 'tie')`,
    ),
    check(
      'duels_outcome_reason_check',
      sql`${table.outcomeReason} IS NULL OR ${table.outcomeReason} IN ('time', 'forfeit', 'timeout', 'walkover', 'declined')`,
    ),
  ],
)

export const duelParticipants = pgTable(
  'duel_participants',
  {
    duelParticipantId: uuid('duel_participant_id').primaryKey().defaultRandom(),
    duelId: uuid('duel_id')
      .notNull()
      .references(() => duels.duelId, { onDelete: 'cascade' }),
    role: text('role', { enum: duelRoles }).notNull(),
    // Anulável: visitante, ou conta apagada (o apelido fica na linha).
    userId: uuid('user_id').references(() => users.userId, { onDelete: 'set null' }),
    nickname: text('nickname').notNull(),
    tokenHash: text('token_hash').notNull().unique(),
    startedAt: instant('started_at'),
    finishedAt: instant('finished_at'),
    elapsedMs: integer('elapsed_ms'),
    helpsUsed: integer('helps_used').notNull().default(0),
    penaltyMs: integer('penalty_ms').notNull().default(0),
    endReason: text('end_reason', { enum: duelEndReasons }),
    ...timestamps,
  },
  (table) => [
    uniqueIndex('duel_participants_duel_role_unique').on(table.duelId, table.role),
    index('duel_participants_user_id_idx')
      .on(table.userId)
      .where(sql`${table.userId} IS NOT NULL`),
    check('duel_participants_role_check', sql`${table.role} IN ('creator', 'opponent')`),
    check('duel_participants_nickname_check', sql`char_length(${table.nickname}) BETWEEN 1 AND 24`),
    check(
      'duel_participants_end_pair',
      sql`(${table.finishedAt} IS NULL) = (${table.endReason} IS NULL)`,
    ),
    check(
      'duel_participants_end_reason_check',
      sql`${table.endReason} IS NULL OR ${table.endReason} IN ('completed', 'forfeit', 'timeout')`,
    ),
    check(
      'duel_participants_completed_elapsed',
      sql`${table.endReason} IS DISTINCT FROM 'completed' OR ${table.elapsedMs} IS NOT NULL`,
    ),
    check('duel_participants_helps_check', sql`${table.helpsUsed} BETWEEN 0 AND 1000`),
  ],
)

export type SourceSettingSnapshot = { sourceId: string; visible: boolean; position: number }[]

// Feature 060: visibilidade e ordem das fontes, uma linha por fonte (sem linhas = padrão do código).
export const sourceSettings = pgTable(
  'source_settings',
  {
    sourceSettingId: uuid('source_setting_id').primaryKey().defaultRandom(),
    sourceId: text('source_id').notNull(),
    visible: boolean('visible').notNull().default(true),
    position: integer('position').notNull(),
    ...timestamps,
  },
  (table) => [
    uniqueIndex('source_settings_source_unique').on(table.sourceId),
    uniqueIndex('source_settings_position_unique').on(table.position),
    check(
      'source_settings_source_check',
      sql`${table.sourceId} IN ('oglobo', 'cruzadaonline', 'cruzadasbrasil', 'clube')`,
    ),
    check('source_settings_position_check', sql`${table.position} >= 0`),
  ],
)

// Registro de alterações: uma linha por salvamento que mudou algo; nenhuma rota lê.
export const sourceSettingChanges = pgTable('source_setting_changes', {
  sourceSettingChangeId: uuid('source_setting_change_id').primaryKey().defaultRandom(),
  userId: uuid('user_id').references(() => users.userId, { onDelete: 'set null' }),
  before: jsonb('before').$type<SourceSettingSnapshot>().notNull(),
  after: jsonb('after').$type<SourceSettingSnapshot>().notNull(),
  ...timestamps,
})
