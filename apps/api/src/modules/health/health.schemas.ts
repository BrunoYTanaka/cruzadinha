import { healthStatusSchema } from '@cruzadinha/shared'
import type { FastifySchema } from 'fastify'
import { errorResponse, toDocSchema } from '../../docs/doc-schema'

export const healthSchema = {
  tags: ['health'],
  summary: 'Verifica a saúde da API e do banco',
  description: 'Responde 200 mesmo com o banco fora do ar; o campo `database` diz o estado dele.',
  response: {
    200: { description: 'API no ar', ...toDocSchema(healthStatusSchema) },
    500: errorResponse('`internal-error`: falha inesperada.'),
  },
} satisfies FastifySchema
