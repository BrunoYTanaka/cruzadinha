import { puzzleResponseSchema } from '@cruzadinha/shared'
import type { FastifySchema } from 'fastify'
import { commonErrors, errorResponse, retryAfterHeader, toDocSchema } from '../../docs/doc-schema'

const unauthenticated = errorResponse('`unauthenticated`: sem sessão válida.')
const unavailable = errorResponse(
  '`puzzle-unavailable`: data futura, ou a fonte não publica puzzle nessa data.',
)

export const getPuzzleByDateSchema = {
  tags: ['puzzles'],
  security: [{ session: [] }],
  summary: 'Busca o puzzle de uma data',
  description:
    'Devolve o puzzle guardado ou, se faltar e a data não for futura, busca na fonte, guarda e devolve. ' +
    'A resposta nunca traz as letras de resposta. Buscas à fonte contam no limite de tentativas.',
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
    200: { description: 'Puzzle sem a solução', ...toDocSchema(puzzleResponseSchema) },
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
  security: [{ session: [] }],
  summary: 'Busca um puzzle guardado pelo identificador',
  description: 'Só lê o que já está guardado; nunca consulta a fonte. Sem as letras de resposta.',
  params: {
    type: 'object',
    properties: {
      id: { type: 'string', format: 'uuid', description: 'Identificador `puzzleId`.' },
    },
    required: ['id'],
  },
  response: {
    200: { description: 'Puzzle sem a solução', ...toDocSchema(puzzleResponseSchema) },
    401: unauthenticated,
    404: errorResponse('`puzzle-unavailable`: identificador inexistente ou inválido.'),
    ...commonErrors,
  },
} satisfies FastifySchema
