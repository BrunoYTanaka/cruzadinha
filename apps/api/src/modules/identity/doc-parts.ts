import { authResponseSchema, emailRequestAcceptedSchema } from '@cruzadinha/shared'
import {
  errorResponse,
  retryAfterHeader,
  setCookieHeader,
  toDocSchema,
} from '../../platform/docs/doc-schema'

export const emailDescription =
  'Espaços nas pontas são removidos e maiúsculas viram minúsculas antes da checagem.'

export const sessionOpened = setCookieHeader(
  'Cookie `sid` da sessão (`HttpOnly`, `SameSite=Lax`), enviado pelo navegador nas chamadas seguintes.',
)

export const authenticated = (description: string) => ({
  description,
  ...toDocSchema(authResponseSchema),
})

export const tooManyAttempts = {
  ...errorResponse('`too-many-attempts`: limite de tentativas atingido.'),
  headers: retryAfterHeader,
}

export const accepted = (description: string) => ({
  description,
  ...toDocSchema(emailRequestAcceptedSchema),
})

export const emailUnavailable = {
  ...errorResponse(
    '`email-unavailable`: o envio de e-mail está indisponível (sem chamar o provedor); ' +
      '`retryAfter` diz quando tentar de novo.',
  ),
  headers: retryAfterHeader,
}

export const emptyOk = (description: string) => ({
  description,
  type: 'object',
  properties: {},
})

export const sendOrder =
  'Ordem das checagens: cadastro aberto (só nas rotas de cadastro), limite por endereço, corpo, ' +
  'envio disponível. O e-mail sai depois da resposta, e a resposta é igual com ou sem conta ou pendência.'
