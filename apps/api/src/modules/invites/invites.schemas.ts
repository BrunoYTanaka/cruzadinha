import { createdInviteSchema, inviteListSchema } from '@cruzadinha/shared'
import type { FastifySchema } from 'fastify'
import { commonErrors, errorResponse, retryAfterHeader, toDocSchema } from '../../docs/doc-schema'

const unauthenticated = errorResponse('`unauthenticated`: sem sessão válida.')

export const createInviteSchema = {
  tags: ['invites'],
  security: [{ session: [] }],
  summary: 'Gera um convite',
  description:
    'Cada conta tem no máximo 3 convites ativos. Cada geração conta no limite de tentativas.',
  response: {
    201: {
      description: 'Convite criado. O código só aparece nesta resposta.',
      ...toDocSchema(createdInviteSchema),
    },
    401: unauthenticated,
    409: errorResponse('`invite-quota-reached`: a conta já tem 3 convites ativos.'),
    429: {
      ...errorResponse('`too-many-attempts`: limite de tentativas atingido.'),
      headers: retryAfterHeader,
    },
    ...commonErrors,
  },
} satisfies FastifySchema

export const listInvitesSchema = {
  tags: ['invites'],
  security: [{ session: [] }],
  summary: 'Lista os convites da conta',
  description: 'Sem os códigos: só datas e situação de cada convite.',
  response: {
    200: { description: 'Convites da conta', ...toDocSchema(inviteListSchema) },
    401: unauthenticated,
    ...commonErrors,
  },
} satisfies FastifySchema
