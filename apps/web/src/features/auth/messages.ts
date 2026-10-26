import { ApiRequestError } from '../../api/client'
import { formatWait } from '../../lib/time'

// Textos fixos. Nunca dizem se um e-mail existe.
export const authMessages = {
  invalidCredentials: 'E-mail ou senha incorretos.',
  registrationClosed: 'O cadastro está fechado no momento.',
  registrationFailed: 'Não foi possível criar a conta.',
  offline: 'Sem conexão. Tente de novo quando voltar.',
  generic: 'Algo deu errado. Tente de novo.',
  fillAll: 'Preencha todos os campos.',
  checkFields: 'Confira os campos destacados.',
  passwordHint: 'No mínimo 8 caracteres.',
  wrongAccount: 'Entre com a conta desta partida.',
  confirming: 'Confirmando o seu e-mail…',
  passwordsDiffer: 'As senhas não são iguais.',
  // Sem citar cota nem provedor (feature 034, FR-018).
  emailUnavailable: 'Não foi possível enviar o e-mail agora. Tente novamente mais tarde.',
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
  if (error.code === 'email-unavailable') return authMessages.emailUnavailable
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
    if (error.code === 'registration-closed') return authMessages.registrationClosed
    if (error.code === 'registration-failed') return authMessages.registrationFailed
  }
  return authMessages.generic
}

// Cadastro, reenvio e recuperação por e-mail: os mesmos erros comuns, sem texto próprio.
export function emailRequestErrorMessage(error: unknown): string {
  return commonMessage(error) ?? authMessages.generic
}

// Campos que o servidor marcou como inválidos (só em `invalid-input`).
export function invalidFields(error: unknown): string[] {
  return error instanceof ApiRequestError && error.code === 'invalid-input'
    ? (error.fields ?? [])
    : []
}
