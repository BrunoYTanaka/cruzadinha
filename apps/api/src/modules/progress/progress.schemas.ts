import { progressEnvelopeSchema, saveProgressRequestSchema } from '@cruzadinha/shared'
import type { FastifySchema } from 'fastify'
import { commonErrors, errorResponse, toDocSchema } from '../../platform/docs/doc-schema'

const unauthenticated = errorResponse('`unauthenticated`: sem sessão válida.')
const unavailable = errorResponse('`puzzle-unavailable`: identificador inexistente ou inválido.')

const params = {
  type: 'object',
  properties: {
    puzzleId: { type: 'string', format: 'uuid', description: 'Identificador `puzzleId`.' },
  },
  required: ['puzzleId'],
} as const

const stateNote =
  'O corpo é sempre o estado resultante: `progress` é `null` quando o usuário ainda não jogou o puzzle. '

export const getProgressSchema = {
  tags: ['progress'],
  security: [{ session: [] }],
  summary: 'Lê o progresso do usuário em um puzzle',
  description: `${stateNote}Cada usuário só enxerga o próprio progresso.`,
  params,
  response: {
    200: { description: 'Progresso (ou `null`)', ...toDocSchema(progressEnvelopeSchema) },
    401: unauthenticated,
    404: unavailable,
    ...commonErrors,
  },
} satisfies FastifySchema

export const saveProgressSchema = {
  tags: ['progress'],
  security: [{ session: [] }],
  summary: 'Salva o progresso do usuário em um puzzle',
  description:
    `${stateNote}Salvar de novo substitui o progresso. Um salvamento com \`savedAt\` anterior ao já guardado não altera nada. ` +
    'Com `status: completed` o servidor registra o momento da conclusão, o tempo de término e atualiza o recorde se ele foi batido. ' +
    'Um puzzle concluído só aceita repetir a mesma conclusão; para jogar de novo use o reinício.',
  params,
  body: {
    ...toDocSchema(saveProgressRequestSchema),
    examples: [
      {
        cells: [
          ['A', null],
          [null, 'D'],
        ],
        elapsedMs: 83000,
        status: 'in_progress',
        savedAt: '2026-10-13T14:03:22.000Z',
      },
    ],
  },
  response: {
    200: { description: 'Progresso resultante', ...toDocSchema(progressEnvelopeSchema) },
    400: errorResponse(
      '`invalid-input`: letras fora da grade, tempo fora de 0 a 7 dias, `status` ou `savedAt` inválidos.',
    ),
    401: unauthenticated,
    404: unavailable,
    409: errorResponse(
      '`progress-completed`: o puzzle já está concluído; reinicie para jogar de novo.',
    ),
    ...commonErrors,
  },
} satisfies FastifySchema

export const resetProgressSchema = {
  tags: ['progress'],
  security: [{ session: [] }],
  summary: 'Reinicia o puzzle do zero',
  description:
    'Zera letras e tempo da partida atual e volta a `in_progress`. A conclusão anterior é descartada; o melhor tempo e a data dele são mantidos.',
  params,
  response: {
    200: { description: 'Progresso reiniciado', ...toDocSchema(progressEnvelopeSchema) },
    401: unauthenticated,
    404: unavailable,
    ...commonErrors,
  },
} satisfies FastifySchema
