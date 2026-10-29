import {
  registerRequestSchema,
  registrationStatusSchema,
  resendVerificationRequestSchema,
  verifyEmailRequestSchema,
} from '@cruzadinha/shared'
import type { FastifySchema } from 'fastify'
import {
  commonErrors,
  errorResponse,
  toDocSchema,
  withFieldDescription,
} from '../../../platform/docs/doc-schema'
import {
  emailDescription,
  tooManyAttempts,
  accepted,
  emailUnavailable,
  emptyOk,
  sendOrder,
} from '../doc-parts'

export const registerSchema = {
  tags: ['auth'],
  summary: 'Pede o cadastro de uma conta com e-mail e senha',
  description:
    'Só funciona com o cadastro aberto (`REGISTRATION_ENABLED=true`); fechado, responde 403 antes ' +
    'de qualquer outra checagem. Pede só o e-mail: não cria conta nem sessão, grava uma pendência e ' +
    'envia um link de confirmação; a senha é escolhida em `POST /api/auth/verify-email`, por quem ' +
    'abriu o link. Para um e-mail que já tem conta, ' +
    `a resposta é a mesma e o dono recebe um aviso. ${sendOrder} \`inviteCode\` é aceito e ignorado, ` +
    'só para o site anterior.',
  body: {
    ...withFieldDescription(toDocSchema(registerRequestSchema), 'email', emailDescription),
    examples: [{ email: 'ana@example.com', captchaToken: '0.AbCdEf…' }],
  },
  response: {
    202: accepted('Pedido aceito; `retryAfter` é o tempo até o próximo envio permitido'),
    400: errorResponse(
      '`invalid-input` (com `fields`): corpo inválido. `captcha-failed`: prova do captcha ausente, inválida, expirada, repetida, de outra ação ou de outro site, ou serviço de verificação fora do ar; a resposta é a mesma com ou sem conta.',
    ),
    403: errorResponse('`registration-closed`: o cadastro está fechado.'),
    429: tooManyAttempts,
    503: emailUnavailable,
    500: errorResponse('`internal-error`: falha inesperada.'),
  },
} satisfies FastifySchema

export const resendVerificationSchema = {
  tags: ['auth'],
  summary: 'Reenvia o link de confirmação do e-mail',
  description:
    'Com pendência e fora do intervalo mínimo, troca o token (o link antigo deixa de valer) e ' +
    'envia. Dentro do intervalo, ou sem pendência, não envia nada e responde igual, com o tempo ' +
    `restante em \`retryAfter\`. Fechado o cadastro, responde 403. ${sendOrder}`,
  body: {
    ...withFieldDescription(
      toDocSchema(resendVerificationRequestSchema),
      'email',
      emailDescription,
    ),
    examples: [{ email: 'ana@example.com', captchaToken: '0.AbCdEf…' }],
  },
  response: {
    202: accepted('Pedido aceito; `retryAfter` é o tempo até o próximo envio permitido'),
    400: errorResponse(
      '`invalid-input` (com `fields`): corpo inválido. `captcha-failed`: prova do captcha ausente, inválida, expirada, repetida, de outra ação ou de outro site, ou serviço de verificação fora do ar; a resposta é a mesma com ou sem conta.',
    ),
    403: errorResponse('`registration-closed`: o cadastro está fechado.'),
    429: tooManyAttempts,
    503: emailUnavailable,
    500: errorResponse('`internal-error`: falha inesperada.'),
  },
} satisfies FastifySchema

export const verifyEmailSchema = {
  tags: ['auth'],
  summary: 'Confirma o e-mail e cria a conta',
  description:
    'Valida o corpo antes do token (senha inválida não gasta o link), depois o token (uso único e ' +
    'validade de 24 horas), cria a conta com a senha enviada e apaga a pendência. Não abre sessão. Funciona mesmo com o cadastro fechado, para ' +
    'uma pendência já criada.',
  body: {
    ...toDocSchema(verifyEmailRequestSchema),
    examples: [{ token: 'A'.repeat(43), password: 'senha-de-exemplo' }],
  },
  response: {
    200: emptyOk('Conta criada'),
    400: errorResponse(
      '`invalid-input` ou `invalid-token`: token malformado, vencido ou já usado.',
    ),
    429: tooManyAttempts,
    ...commonErrors,
  },
} satisfies FastifySchema

export const registrationSchema = {
  tags: ['auth'],
  summary: 'Diz se o cadastro está aberto',
  description:
    'Sem sessão. O site mostra "Criar conta" só quando `open` é verdadeiro e mostra o desafio ' +
    'do captcha nos pedidos de e-mail só quando `captchaRequired` é verdadeiro.',
  response: {
    200: { description: 'Situação do cadastro', ...toDocSchema(registrationStatusSchema) },
    ...commonErrors,
  },
} satisfies FastifySchema
