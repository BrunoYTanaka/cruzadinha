import {
  createDuelRequestSchema,
  createDuelResponseSchema,
  declineDuelResponseSchema,
  duelEnvelopeSchema,
  duelRefRequestSchema,
  duelStateResponseSchema,
  finishDuelRequestSchema,
  lookupDuelRequestSchema,
  lookupDuelResponseSchema,
  myDuelsRequestSchema,
  myDuelsResponseSchema,
  startDuelRequestSchema,
  startDuelResponseSchema,
} from '@cruzadinha/shared'
import type { FastifySchema } from 'fastify'
import type { z } from 'zod'
import {
  commonErrors,
  errorResponse,
  optionalSessionSecurity,
  retryAfterHeader,
  toDocSchema,
} from '../../platform/docs/doc-schema'

// Todas as rotas do duelo são POST com corpo: nenhum token nem código vai na URL (feature 058).
const credentialNote =
  'A credencial é a sessão (que vale mais) ou `participantToken` no corpo. Sem nenhuma das duas, ou sem ser participante, a resposta é `404 not-found`.'

const tooMany = {
  ...errorResponse('`too-many-attempts`: limite de tentativas por endereço.'),
  headers: retryAfterHeader,
}
const invalid = errorResponse('`invalid-input`: corpo inválido, com os nomes dos campos.')
const notFound = errorResponse('`not-found`: não existe, não está aberto ou você não participa.')
const unauthenticated = errorResponse(
  '`unauthenticated`: cookie de sessão presente, mas inválido (o cookie é apagado).',
)
const conflict = errorResponse('Conflito de estado do duelo.')

function route(
  summary: string,
  description: string,
  body: z.ZodType,
  ok: z.ZodType,
  extra: Record<number, ReturnType<typeof errorResponse>> = {},
): FastifySchema {
  return {
    tags: ['duels'],
    security: optionalSessionSecurity,
    summary,
    description,
    body: toDocSchema(body),
    response: {
      200: { description: 'Resposta', ...toDocSchema(ok) },
      400: invalid,
      401: unauthenticated,
      404: notFound,
      429: tooMany,
      ...extra,
      ...commonErrors,
    },
  } satisfies FastifySchema
}

export const createDuelSchema = route(
  'Cria um duelo x1',
  'Cria o duelo sobre uma cruzada já guardada e devolve o link, o código de 8 caracteres e, para visitante, o token do participante (guardar no aparelho). Limite de criações por endereço e teto de duelos abertos por conta.',
  createDuelRequestSchema,
  createDuelResponseSchema,
  { 409: errorResponse('`open-limit`: já há duelos abertos demais.') },
)

export const lookupDuelSchema = route(
  'Consulta um duelo aberto por código ou link',
  'Leitura pura: nunca altera o duelo. Só encontra duelos abertos e responde igual para inexistente e não aberto. Limite de taxa por endereço.',
  lookupDuelRequestSchema,
  lookupDuelResponseSchema,
)

export const startDuelSchema = route(
  'Começa a partida (e ocupa a vaga de oponente)',
  `Grava o início no servidor. Dois "Começar" simultâneos ocupam uma vaga só (\`409 duel-taken\` para o segundo). O criador usa a mesma rota para começar a própria partida. ${credentialNote}`,
  startDuelRequestSchema,
  startDuelResponseSchema,
  { 409: conflict },
)

export const declineDuelSchema = route(
  'Recusa o desafio',
  'Encerra o duelo aberto; quem recusa não vira participante.',
  duelRefRequestSchema,
  declineDuelResponseSchema,
  { 409: conflict },
)

export const stateDuelSchema = route(
  'Lê o estado do duelo',
  `Antes do resultado final nunca traz o tempo do outro jogador. ${credentialNote}`,
  duelRefRequestSchema,
  duelStateResponseSchema,
)

export const finishDuelSchema = route(
  'Conclui a partida',
  `O tempo é o do servidor desde o "Começar"; acima do tempo máximo vale "tempo esgotado" e perde. As ajudas são as declaradas pelo cliente. ${credentialNote}`,
  finishDuelRequestSchema,
  duelEnvelopeSchema,
  { 409: conflict },
)

export const forfeitDuelSchema = route(
  'Desiste do duelo',
  `Vale na hora, sem desfazer: quem desiste perde. ${credentialNote}`,
  duelRefRequestSchema,
  duelEnvelopeSchema,
  { 409: conflict },
)

export const cancelDuelSchema = route(
  'Cancela o duelo (só o criador, só aberto)',
  `Sem desfazer. ${credentialNote}`,
  duelRefRequestSchema,
  duelEnvelopeSchema,
  { 409: conflict },
)

export const myDuelsSchema = route(
  'Lista os duelos ativos ("Meus x1")',
  'Logado: os da conta, em qualquer aparelho. Visitante: os dos tokens enviados no corpo (no máximo 20). A sessão vence os tokens. Traz abertos, em andamento e finalizados nas últimas 24 horas.',
  myDuelsRequestSchema,
  myDuelsResponseSchema,
)
