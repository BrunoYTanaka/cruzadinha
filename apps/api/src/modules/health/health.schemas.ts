import { healthStatusSchema } from '@cruzadinha/shared'
import type { FastifySchema } from 'fastify'
import { z } from 'zod'
import { errorResponse, toDocSchema } from '../../platform/docs/doc-schema'

export const healthSchema = {
  tags: ['health'],
  summary: 'Verifica a saúde da API e do banco',
  description:
    'Responde 200 mesmo com o banco fora do ar; o campo `database` diz o estado dele. `version` é a versão publicada da API e `commit`, quando conhecido, o commit publicado.',
  response: {
    200: { description: 'API no ar', ...toDocSchema(healthStatusSchema) },
    500: errorResponse('`internal-error`: falha inesperada.'),
  },
} satisfies FastifySchema

export const liveSchema = {
  tags: ['health'],
  summary: 'Diz se o processo da API está no ar, sem consultar o banco',
  description:
    'Health check do provedor e alvo do ping que mantém a instância acordada. Não toca o banco, para o Neon poder suspender sem uso.',
  response: {
    200: { description: 'Processo no ar', ...toDocSchema(z.object({ status: z.literal('ok') })) },
  },
} satisfies FastifySchema
