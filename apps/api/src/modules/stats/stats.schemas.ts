import { statsSchema } from '@cruzadinha/shared'
import type { FastifySchema } from 'fastify'
import { commonErrors, errorResponse, toDocSchema } from '../../platform/docs/doc-schema'

export const getStatsSchema = {
  tags: ['stats'],
  security: [{ session: [] }],
  summary: 'Estatísticas e sequência de dias do usuário',
  description:
    'Calcula, a partir do progresso do usuário, a sequência atual e a maior de dias seguidos ' +
    '(dia da conclusão em Brasília), o total concluído, o tempo médio e, por fonte, total, média ' +
    'e melhor tempo. Só lê o que está guardado; não traz grade, dicas, solução nem letras. ' +
    'Cada usuário só enxerga as próprias estatísticas.',
  response: {
    200: {
      description: 'Estatísticas (zeros e `null` quando não há conclusões)',
      ...toDocSchema(statsSchema),
    },
    401: errorResponse('`unauthenticated`: sem sessão válida.'),
    ...commonErrors,
  },
} satisfies FastifySchema
