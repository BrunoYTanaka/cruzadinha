import {
  changeEmailRequestSchema,
  changePasswordRequestSchema,
  confirmEmailChangeRequestSchema,
  deleteAccountRequestSchema,
} from '@cruzadinha/shared'
import type { FastifySchema } from 'fastify'
import {
  commonErrors,
  errorResponse,
  setCookieHeader,
  toDocSchema,
  withFieldDescription,
} from '../../../platform/docs/doc-schema'
import {
  accepted,
  emailDescription,
  emailUnavailable,
  emptyOk,
  tooManyAttempts,
} from '../doc-parts'

const security = [{ session: [] }]
const unauthenticated = errorResponse('`unauthenticated`: sem sessão válida.')
const currentPassword =
  'Senha atual: confere antes de agir, no máximo 5 erros em 15 minutos por conta (`429`). ' +
  'Senha errada é `400 wrong-password`, nunca `401`.'

export const changePasswordSchema = {
  tags: ['auth'],
  security,
  summary: 'Troca a senha estando logado',
  description: `${currentPassword} Grava a nova senha, encerra as outras sessões (a atual continua) e revoga os links de recuperação abertos.`,
  body: {
    ...toDocSchema(changePasswordRequestSchema),
    examples: [{ currentPassword: 'senha-de-exemplo', newPassword: 'outra-senha-de-exemplo' }],
  },
  response: {
    200: emptyOk('Senha trocada'),
    400: errorResponse('`invalid-input` (com `fields`) ou `wrong-password`.'),
    401: unauthenticated,
    429: tooManyAttempts,
    ...commonErrors,
  },
} satisfies FastifySchema

export const logoutOthersSchema = {
  tags: ['auth'],
  security,
  summary: 'Encerra a conta em todos os outros aparelhos',
  description: 'Sem senha. Encerra todas as outras sessões abertas; a atual continua. Idempotente.',
  body: { type: 'object', additionalProperties: false, properties: {} },
  response: {
    200: emptyOk('Outras sessões encerradas'),
    400: errorResponse('`invalid-input`: corpo diferente de `{}`.'),
    401: unauthenticated,
    ...commonErrors,
  },
} satisfies FastifySchema

export const changeEmailSchema = {
  tags: ['auth'],
  security,
  summary: 'Pede a troca do e-mail da conta',
  description:
    `${currentPassword} Envia um link de uso único, válido por 60 minutos, ao novo endereço e um ` +
    'aviso (sem o novo endereço) ao atual. O e-mail só muda quando o link é aberto. A resposta é a ' +
    'mesma com o endereço livre ou de outra conta. Ordem: sessão, limite por endereço, corpo, envio ' +
    'disponível, senha atual, endereço igual ao atual, intervalo mínimo.',
  body: {
    ...withFieldDescription(toDocSchema(changeEmailRequestSchema), 'newEmail', emailDescription),
    examples: [{ currentPassword: 'senha-de-exemplo', newEmail: 'ana.nova@example.com' }],
  },
  response: {
    202: accepted('Pedido aceito; `retryAfter` é o tempo até o próximo pedido permitido'),
    400: errorResponse(
      '`invalid-input` (com `fields`, inclusive `newEmail` igual ao atual) ou `wrong-password`.',
    ),
    401: unauthenticated,
    429: tooManyAttempts,
    503: emailUnavailable,
    500: errorResponse('`internal-error`: falha inesperada.'),
  },
} satisfies FastifySchema

export const confirmEmailChangeSchema = {
  tags: ['auth'],
  summary: 'Confirma a troca de e-mail com o token do link',
  description:
    'Sem sessão: o link é a prova de posse. Funciona com o cadastro fechado. As sessões continuam.',
  body: {
    ...toDocSchema(confirmEmailChangeRequestSchema),
    examples: [{ token: 'A'.repeat(43) }],
  },
  response: {
    200: emptyOk('E-mail trocado'),
    400: errorResponse('`invalid-input` (com `fields`) ou `invalid-token`.'),
    429: tooManyAttempts,
    ...commonErrors,
  },
} satisfies FastifySchema

export const deleteAccountSchema = {
  tags: ['auth'],
  security,
  summary: 'Exclui a conta',
  description: `${currentPassword} Apaga a conta e tudo o que é dela e apaga o cookie de sessão.`,
  body: {
    ...toDocSchema(deleteAccountRequestSchema),
    examples: [{ currentPassword: 'senha-de-exemplo' }],
  },
  response: {
    200: {
      ...emptyOk('Conta excluída'),
      headers: setCookieHeader('Cookie `sid` expirado, para o navegador apagá-lo.'),
    },
    400: errorResponse('`invalid-input` (com `fields`) ou `wrong-password`.'),
    401: unauthenticated,
    429: tooManyAttempts,
    ...commonErrors,
  },
} satisfies FastifySchema
