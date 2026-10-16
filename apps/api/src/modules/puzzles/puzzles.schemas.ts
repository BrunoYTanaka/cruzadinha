import { puzzleResponseSchema } from '@cruzadinha/shared'
import type { FastifySchema } from 'fastify'
import {
  commonErrors,
  errorResponse,
  optionalSessionSecurity,
  retryAfterHeader,
  toDocSchema,
} from '../../docs/doc-schema'

const unauthenticated = errorResponse(
  '`unauthenticated`: cookie de sessão presente, mas inválido (vencido ou encerrado); a resposta o apaga.',
)
const unavailable = errorResponse(
  '`puzzle-unavailable`: data futura, ou a fonte não publica puzzle nessa data.',
)

export const getPuzzleByDateSchema = {
  tags: ['puzzles'],
  // Sessão opcional (feature 013): visitantes também recebem o puzzle e a solução.
  security: optionalSessionSecurity,
  summary: 'Busca o puzzle de uma data',
  description:
    'Devolve o puzzle guardado ou, se faltar e a data não for futura, busca na fonte, guarda e devolve. ' +
    'A resposta traz também a `solution` (uma letra por célula aberta, `null` nos blocos), com ou sem sessão. Buscas à fonte contam no limite de tentativas por endereço.',
  querystring: {
    type: 'object',
    properties: {
      level: {
        type: 'string',
        enum: ['daily'],
        default: 'daily',
        description: 'Nível do puzzle. Só `daily` existe.',
      },
      date: {
        type: 'string',
        format: 'date',
        description: 'Dia do puzzle, no formato AAAA-MM-DD.',
        examples: ['2026-10-13'],
      },
    },
    required: ['date'],
  },
  response: {
    200: { description: 'Puzzle com a solução', ...toDocSchema(puzzleResponseSchema) },
    400: errorResponse('`invalid-input`: `level` ou `date` inválidos.'),
    401: unauthenticated,
    404: unavailable,
    429: {
      ...errorResponse('`too-many-attempts`: limite de buscas à fonte atingido.'),
      headers: retryAfterHeader,
    },
    502: errorResponse('`puzzle-source-failed`: não foi possível buscar o puzzle na fonte agora.'),
    ...commonErrors,
  },
} satisfies FastifySchema

export const getPuzzleByIdSchema = {
  tags: ['puzzles'],
  // Sessão opcional (feature 013): visitantes também recebem o puzzle e a solução.
  security: optionalSessionSecurity,
  summary: 'Busca um puzzle guardado pelo identificador',
  description:
    'Só lê o que já está guardado; nunca consulta a fonte. A resposta traz a `solution`, com ou sem sessão.',
  params: {
    type: 'object',
    properties: {
      id: { type: 'string', format: 'uuid', description: 'Identificador `puzzleId`.' },
    },
    required: ['id'],
  },
  response: {
    200: { description: 'Puzzle com a solução', ...toDocSchema(puzzleResponseSchema) },
    401: unauthenticated,
    404: errorResponse('`puzzle-unavailable`: identificador inexistente ou inválido.'),
    ...commonErrors,
  },
} satisfies FastifySchema
