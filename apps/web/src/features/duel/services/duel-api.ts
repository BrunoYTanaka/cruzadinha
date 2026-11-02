import {
  createDuelResponseSchema,
  declineDuelResponseSchema,
  duelEnvelopeSchema,
  duelStateResponseSchema,
  lookupDuelResponseSchema,
  myDuelsResponseSchema,
  startDuelResponseSchema,
  type CreateDuelRequest,
  type CreateDuelResponse,
  type DuelStateResponse,
  type LookupDuelRequest,
  type LookupDuelResponse,
  type MyDuelsResponse,
  type StartDuelResponse,
  type DuelView,
} from '@cruzadinha/shared'
import { ApiRequestError, apiRequest } from '../../../shared/services/api/client/client'

// Credencial de quem joga: a sessão vai no cookie; o visitante manda o token do participante no
// corpo, nunca na URL (feature 058).
export type DuelCredential = { linkToken: string; participantToken?: string }

const post = <T>(path: string, schema: Parameters<typeof apiRequest<T>>[1], body: unknown) =>
  apiRequest(path, schema, { method: 'POST', body })

export const createDuel = (body: CreateDuelRequest): Promise<CreateDuelResponse> =>
  post('/api/duels', createDuelResponseSchema, body)

export const lookupDuel = (body: LookupDuelRequest): Promise<LookupDuelResponse> =>
  post('/api/duels/lookup', lookupDuelResponseSchema, body)

export const startDuel = (
  body: DuelCredential & { nickname: string },
): Promise<StartDuelResponse> => post('/api/duels/start', startDuelResponseSchema, body)

export const declineDuel = (body: DuelCredential): Promise<{ declined: true }> =>
  post('/api/duels/decline', declineDuelResponseSchema, body)

export const getDuelState = (body: DuelCredential): Promise<DuelStateResponse> =>
  post('/api/duels/state', duelStateResponseSchema, body)

export async function finishDuel(body: DuelCredential & { helpsUsed: number }): Promise<DuelView> {
  return (await post('/api/duels/finish', duelEnvelopeSchema, body)).duel
}

export async function forfeitDuel(body: DuelCredential): Promise<DuelView> {
  return (await post('/api/duels/forfeit', duelEnvelopeSchema, body)).duel
}

export async function cancelDuel(body: DuelCredential): Promise<DuelView> {
  return (await post('/api/duels/cancel', duelEnvelopeSchema, body)).duel
}

export const getMyDuels = (participantTokens: string[]): Promise<MyDuelsResponse> =>
  post('/api/duels/mine', myDuelsResponseSchema, { participantTokens })

// Uma API anterior à feature responde 404 sem o corpo de erro conhecido; a API nova sempre manda o
// código. Só o primeiro caso é "o x1 não está disponível agora" (FR-032).
export function isDuelUnavailable(error: unknown): boolean {
  return error instanceof ApiRequestError && error.status === 404 && error.code === undefined
}
