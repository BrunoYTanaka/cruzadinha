import { loginRequestSchema } from '@cruzadinha/shared'
import type { FastifySchema } from 'fastify'
import {
  commonErrors,
  errorResponse,
  setCookieHeader,
  toDocSchema,
  withFieldDescription,
} from '../../../docs/doc-schema'
import { emailDescription, sessionOpened, authenticated, tooManyAttempts } from '../doc-parts'

export const loginSchema = {
  tags: ['auth'],
  summary: 'Entra com e-mail e senha',
  description: 'Cada tentativa conta no limite por endereço e no limite por e-mail.',
  body: {
    ...withFieldDescription(toDocSchema(loginRequestSchema), 'email', emailDescription),
    examples: [{ email: 'ana@example.com', password: 'senha-de-exemplo' }],
  },
  response: {
    200: { ...authenticated('Sessão aberta'), headers: sessionOpened },
    400: errorResponse('`invalid-input` (com `fields`): corpo inválido.'),
    401: errorResponse('`invalid-credentials`: e-mail ou senha incorretos.'),
    429: tooManyAttempts,
    ...commonErrors,
  },
} satisfies FastifySchema

export const logoutSchema = {
  tags: ['auth'],
  summary: 'Encerra a sessão atual',
  description: 'Idempotente: sem sessão válida também responde 204 e apaga o cookie.',
  response: {
    204: {
      description: 'Sessão encerrada',
      type: 'null',
      headers: setCookieHeader('Cookie `sid` expirado, para o navegador apagá-lo.'),
    },
    ...commonErrors,
  },
} satisfies FastifySchema

export const meSchema = {
  tags: ['auth'],
  security: [{ session: [] }],
  summary: 'Mostra a conta da sessão atual',
  response: {
    200: {
      ...authenticated('Conta autenticada'),
      headers: setCookieHeader('Enviado só quando a sessão foi renovada.'),
    },
    401: errorResponse('`unauthenticated`: sem sessão válida.'),
    ...commonErrors,
  },
} satisfies FastifySchema
