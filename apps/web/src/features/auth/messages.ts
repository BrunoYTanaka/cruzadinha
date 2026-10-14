import { ApiRequestError } from '../../api/client'
import { formatWait } from '../../lib/time'

// Textos fixos. Nunca dizem se um e-mail existe nem por que um convite foi recusado.
export const authMessages = {
  invalidCredentials: 'E-mail ou senha incorretos.',
  invalidInvite: 'Convite inválido.',
  registrationFailed: 'Não foi possível criar a conta.',
  offline: 'Sem conexão. Tente de novo quando voltar.',
  generic: 'Algo deu errado. Tente de novo.',
  fillAll: 'Preencha todos os campos.',
  checkFields: 'Confira os campos destacados.',
  passwordHint: 'No mínimo 8 caracteres.',
  wrongAccount: 'Entre com a conta desta partida.',
} as const

export function tooManyAttempts(retryAfterSeconds: number | undefined): string {
  return retryAfterSeconds === undefined
    ? 'Muitas tentativas. Tente de novo mais tarde.'
    : `Muitas tentativas. Tente de novo em ${formatWait(retryAfterSeconds)}.`
}

function commonMessage(error: unknown): string | null {
  if (!(error instanceof ApiRequestError)) return authMessages.generic
  if (error.isOffline) return authMessages.offline
  if (error.status === 429) return tooManyAttempts(error.retryAfterSeconds)
  if (error.code === 'invalid-input') return authMessages.checkFields
  return null
}

export function loginErrorMessage(error: unknown): string {
  const common = commonMessage(error)
  if (common) return common
  if (error instanceof ApiRequestError && error.code === 'invalid-credentials') {
    return authMessages.invalidCredentials
  }
  return authMessages.generic
}

export function registerErrorMessage(error: unknown): string {
  const common = commonMessage(error)
  if (common) return common
  if (error instanceof ApiRequestError) {
    if (error.code === 'invalid-invite') return authMessages.invalidInvite
    if (error.code === 'registration-failed') return authMessages.registrationFailed
  }
  return authMessages.generic
}

// Campos que o servidor marcou como inválidos (só em `invalid-input`).
export function invalidFields(error: unknown): string[] {
  return error instanceof ApiRequestError && error.code === 'invalid-input'
    ? (error.fields ?? [])
    : []
}
