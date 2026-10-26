import {
  authResponseSchema,
  emailRequestAcceptedSchema,
  forgotPasswordRequestSchema,
  loginRequestSchema,
  registerRequestSchema,
  registrationStatusSchema,
  resendVerificationRequestSchema,
  resetPasswordRequestSchema,
  verifyEmailRequestSchema,
} from '@cruzadinha/shared'
import type { FastifySchema } from 'fastify'
import {
  commonErrors,
  errorResponse,
  retryAfterHeader,
  setCookieHeader,
  toDocSchema,
  withFieldDescription,
} from '../../docs/doc-schema'

const emailDescription =
  'Espaços nas pontas são removidos e maiúsculas viram minúsculas antes da checagem.'

const sessionOpened = setCookieHeader(
  'Cookie `sid` da sessão (`HttpOnly`, `SameSite=Lax`), enviado pelo navegador nas chamadas seguintes.',
)

const authenticated = (description: string) => ({
  description,
  ...toDocSchema(authResponseSchema),
})

const tooManyAttempts = {
  ...errorResponse('`too-many-attempts`: limite de tentativas atingido.'),
  headers: retryAfterHeader,
}

const accepted = (description: string) => ({
  description,
  ...toDocSchema(emailRequestAcceptedSchema),
})

const emailUnavailable = {
  ...errorResponse(
    '`email-unavailable`: o envio de e-mail está indisponível (sem chamar o provedor); ' +
      '`retryAfter` diz quando tentar de novo.',
  ),
  headers: retryAfterHeader,
}

const emptyOk = (description: string) => ({
  description,
  type: 'object',
  properties: {},
})

const sendOrder =
  'Ordem das checagens: cadastro aberto (só nas rotas de cadastro), limite por endereço, corpo, ' +
  'envio disponível. O e-mail sai depois da resposta, e a resposta é igual com ou sem conta ou pendência.'

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
    examples: [{ email: 'ana@example.com' }],
  },
  response: {
    202: accepted('Pedido aceito; `retryAfter` é o tempo até o próximo envio permitido'),
    400: errorResponse('`invalid-input` (com `fields`): corpo inválido.'),
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
    examples: [{ email: 'ana@example.com' }],
  },
  response: {
    202: accepted('Pedido aceito; `retryAfter` é o tempo até o próximo envio permitido'),
    400: errorResponse('`invalid-input` (com `fields`): corpo inválido.'),
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

export const registrationSchema = {
  tags: ['auth'],
  summary: 'Diz se o cadastro está aberto',
  description: 'Sem sessão. O site mostra "Criar conta" só quando `open` é verdadeiro.',
  response: {
    200: { description: 'Situação do cadastro', ...toDocSchema(registrationStatusSchema) },
    ...commonErrors,
  },
} satisfies FastifySchema

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
