import { z } from 'zod'
import { puzzleSourceIdSchema } from '../puzzle/schema'

// Alfabeto do código curto: sem 0/O, 1/I/L, que se confundem ao digitar (feature 058).
export const DUEL_CODE_ALPHABET = '23456789ABCDEFGHJKMNPQRSTUVWXYZ'
export const DUEL_CODE_LENGTH = 8
export const MAX_DUEL_TOKENS = 20
export const MAX_DUEL_HELPS = 1000
export const MIN_DUEL_MAX_MS = 60_000
export const MAX_DUEL_MAX_MS = 7_200_000
export const DUEL_DEADLINE_HOURS = [1, 24, 168] as const
export const DUEL_PENALTY_OPTIONS_MS = [10_000, 30_000, 60_000] as const

export const duelStateSchema = z.enum(['open', 'running', 'finished', 'cancelled'])
export const helpModeSchema = z.enum(['free', 'forbidden', 'penalty'])

export const nicknameSchema = z.string().trim().min(1).max(24)
export const duelCodeSchema = z
  .string()
  .length(DUEL_CODE_LENGTH)
  .regex(new RegExp(`^[${DUEL_CODE_ALPHABET}]+$`))
export const linkTokenSchema = z.string().min(20).max(200)
export const participantTokenSchema = z.string().min(20).max(200)

const msSchema = z.number().int().min(0)

export const duelRulesSchema = z
  .strictObject({
    helpMode: helpModeSchema,
    helpPenaltyMs: z.number().int().min(1).max(3_600_000).nullable(),
    maxMs: z.number().int().min(MIN_DUEL_MAX_MS).max(MAX_DUEL_MAX_MS).nullable(),
    startDeadlineHours: z.union([z.literal(1), z.literal(24), z.literal(168)]),
  })
  .refine((rules) => (rules.helpMode === 'penalty') === (rules.helpPenaltyMs !== null), {
    path: ['helpPenaltyMs'],
    message: 'helpPenaltyMs vale só com helpMode penalty',
  })

export const createDuelRequestSchema = z.strictObject({
  puzzleId: z.uuid(),
  rules: duelRulesSchema,
  nickname: nicknameSchema,
})

// Credencial: a sessão vale mais; o token do participante vai no corpo, nunca na URL.
const credential = { participantToken: participantTokenSchema.optional() }

export const lookupDuelRequestSchema = z.union([
  z.strictObject({ code: duelCodeSchema }),
  z.strictObject({ linkToken: linkTokenSchema }),
])

export const startDuelRequestSchema = z.strictObject({
  linkToken: linkTokenSchema,
  nickname: nicknameSchema,
  ...credential,
})

export const duelRefRequestSchema = z.strictObject({ linkToken: linkTokenSchema, ...credential })

export const finishDuelRequestSchema = z.strictObject({
  linkToken: linkTokenSchema,
  helpsUsed: z.number().int().min(0).max(MAX_DUEL_HELPS),
  ...credential,
})

export const myDuelsRequestSchema = z.strictObject({
  participantTokens: z.array(participantTokenSchema).max(MAX_DUEL_TOKENS).optional(),
})

// Respostas: descartam campos desconhecidos para o site anterior aceitar versões novas da API.
export const duelRulesViewSchema = z.object({
  helpMode: helpModeSchema,
  helpPenaltyMs: z.number().int().nullable(),
  maxMs: z.number().int().nullable(),
  startDeadlineAt: z.iso.datetime({ offset: true }),
})

export const duelEndReasonSchema = z.enum(['completed', 'forfeit', 'timeout'])
export const duelOutcomeReasonSchema = z.enum([
  'time',
  'forfeit',
  'timeout',
  'walkover',
  'declined',
])

export const duelSideResultSchema = z.object({
  nickname: z.string(),
  endReason: duelEndReasonSchema.nullable(),
  elapsedMs: msSchema.nullable(),
  penaltyMs: msSchema,
  helpsUsed: msSchema,
})

// Estado efetivo (já com prazo, W.O. e tempo esgotado), do ponto de vista de quem pergunta.
export const duelStatusSchema = z.enum(['open', 'running', 'finished', 'cancelled', 'expired'])
export const myDuelStatusSchema = z.enum(['not-started', 'playing', 'waiting-other', 'done'])
export const opponentDuelStatusSchema = z.enum(['not-joined', 'not-started', 'playing', 'done'])

export const duelResultSchema = z.object({
  verdict: z.enum(['won', 'lost', 'tie']),
  reason: duelOutcomeReasonSchema,
  diffMs: msSchema.nullable(),
  me: duelSideResultSchema,
  opponent: duelSideResultSchema.nullable(),
})

export const duelViewSchema = z.object({
  duelId: z.uuid(),
  // Só para participantes.
  linkToken: z.string().optional(),
  // O criador vê o código enquanto o duelo está aberto.
  code: z.string().optional(),
  role: z.enum(['creator', 'opponent']),
  status: duelStatusSchema,
  myStatus: myDuelStatusSchema,
  opponentStatus: opponentDuelStatusSchema,
  source: puzzleSourceIdSchema,
  puzzleDate: z.string(),
  rules: duelRulesViewSchema,
  me: z.object({ nickname: z.string(), startedAt: z.iso.datetime({ offset: true }).nullable() }),
  opponentNickname: z.string().nullable(),
  // Só quando o duelo terminou; antes disso nunca traz o tempo do outro.
  result: duelResultSchema.nullable(),
})

export const duelSummarySchema = z.object({
  duelId: z.uuid(),
  linkToken: z.string(),
  role: z.enum(['creator', 'opponent']),
  status: duelStatusSchema,
  myStatus: myDuelStatusSchema,
  source: puzzleSourceIdSchema,
  puzzleDate: z.string(),
  opponentNickname: z.string().nullable(),
  attention: z.boolean(),
})

export const createDuelResponseSchema = z.object({
  linkToken: z.string(),
  code: z.string(),
  participantToken: z.string().optional(),
  duel: duelViewSchema,
})

export const lookupDuelResponseSchema = z.object({
  linkToken: z.string(),
  rules: duelRulesViewSchema,
  source: puzzleSourceIdSchema,
  puzzleDate: z.string(),
  creatorNickname: z.string(),
})

export const startDuelResponseSchema = z.object({
  participantToken: z.string().optional(),
  duel: duelViewSchema,
  puzzleId: z.uuid(),
  startedAt: z.iso.datetime({ offset: true }),
  serverNow: z.iso.datetime({ offset: true }),
})

export const duelStateResponseSchema = z.object({
  duel: duelViewSchema,
  puzzleId: z.uuid().optional(),
  serverNow: z.iso.datetime({ offset: true }),
})

export const declineDuelResponseSchema = z.object({ declined: z.literal(true) })
export const duelEnvelopeSchema = z.object({ duel: duelViewSchema })
export const myDuelsResponseSchema = z.object({ duels: z.array(duelSummarySchema) })

export type DuelState = z.infer<typeof duelStateSchema>
export type HelpMode = z.infer<typeof helpModeSchema>
export type DuelRules = z.infer<typeof duelRulesSchema>
export type CreateDuelRequest = z.infer<typeof createDuelRequestSchema>
export type LookupDuelRequest = z.infer<typeof lookupDuelRequestSchema>
export type StartDuelRequest = z.infer<typeof startDuelRequestSchema>
export type DuelRefRequest = z.infer<typeof duelRefRequestSchema>
export type FinishDuelRequest = z.infer<typeof finishDuelRequestSchema>
export type MyDuelsRequest = z.infer<typeof myDuelsRequestSchema>
export type DuelView = z.infer<typeof duelViewSchema>
export type DuelSummary = z.infer<typeof duelSummarySchema>
export type DuelResult = z.infer<typeof duelResultSchema>
export type DuelStatus = z.infer<typeof duelStatusSchema>
export type MyDuelStatus = z.infer<typeof myDuelStatusSchema>
export type CreateDuelResponse = z.infer<typeof createDuelResponseSchema>
export type LookupDuelResponse = z.infer<typeof lookupDuelResponseSchema>
export type StartDuelResponse = z.infer<typeof startDuelResponseSchema>
export type DuelStateResponse = z.infer<typeof duelStateResponseSchema>
export type MyDuelsResponse = z.infer<typeof myDuelsResponseSchema>
