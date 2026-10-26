import { forgotPasswordRequestSchema, resetPasswordRequestSchema } from '@cruzadinha/shared'
import type { FastifySchema } from 'fastify'
import {
  commonErrors,
  errorResponse,
  setCookieHeader,
  toDocSchema,
  withFieldDescription,
} from '../../../docs/doc-schema'
import {
  emailDescription,
  tooManyAttempts,
  accepted,
  emailUnavailable,
  emptyOk,
  sendOrder,
} from '../doc-parts'

export const forgotPasswordSchema = {
  tags: ['auth'],
  summary: 'Pede o link para redefinir a senha',
  description:
    'Com conta e fora do intervalo mínimo, cria um token de uso único e validade de 1 hora (o ' +
    'anterior deixa de valer) e envia o link. Responde igual sem conta. Funciona com o cadastro ' +
    `fechado e usa as vagas reservadas à recuperação. ${sendOrder}`,
  body: {
    ...withFieldDescription(toDocSchema(forgotPasswordRequestSchema), 'email', emailDescription),
    examples: [{ email: 'ana@example.com' }],
  },
  response: {
    202: accepted('Pedido aceito; `retryAfter` é o tempo até o próximo envio permitido'),
    400: errorResponse('`invalid-input` (com `fields`): corpo inválido.'),
    429: tooManyAttempts,
    503: emailUnavailable,
    500: errorResponse('`internal-error`: falha inesperada.'),
  },
} satisfies FastifySchema

export const resetPasswordSchema = {
  tags: ['auth'],
  summary: 'Define uma nova senha com o token do e-mail',
  description:
    'Valida o corpo antes do token (senha inválida não consome o link). Grava a nova senha, marca ' +
    'o token como usado e encerra todas as sessões da conta. Não abre sessão.',
  body: {
    ...toDocSchema(resetPasswordRequestSchema),
    examples: [{ token: 'A'.repeat(43), password: 'nova-senha-de-exemplo' }],
  },
  response: {
    200: {
      ...emptyOk('Senha alterada e sessões encerradas'),
      headers: setCookieHeader('Cookie `sid` expirado, para o navegador apagá-lo.'),
    },
    400: errorResponse('`invalid-input` (com `fields`) ou `invalid-token`.'),
    429: tooManyAttempts,
    ...commonErrors,
  },
} satisfies FastifySchema
