import {
  authResponseSchema,
  loginRequestSchema,
  registerRequestSchema,
  registrationStatusSchema,
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

export const registerSchema = {
  tags: ['auth'],
  summary: 'Cadastra uma conta com e-mail e senha',
  description:
    'Só funciona com o cadastro aberto (`REGISTRATION_ENABLED=true`); fechado, responde 403 antes ' +
    'de qualquer outra checagem. Depois, o limite de tentativas por endereço é conferido antes do ' +
    'corpo. Em caso de sucesso, a sessão já fica aberta. `inviteCode` é aceito e ignorado, só para ' +
    'o site anterior.',
  body: {
    ...withFieldDescription(toDocSchema(registerRequestSchema), 'email', emailDescription),
    examples: [{ email: 'ana@example.com', password: 'senha-de-exemplo' }],
  },
  response: {
    201: { ...authenticated('Conta criada e sessão aberta'), headers: sessionOpened },
    400: errorResponse('`invalid-input` (com `fields`): corpo inválido.'),
    403: errorResponse('`registration-closed`: o cadastro está fechado.'),
    409: errorResponse('`registration-failed`: não foi possível concluir o cadastro.'),
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
