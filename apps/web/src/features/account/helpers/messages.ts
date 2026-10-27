import { ApiRequestError } from '../../../shared/services/api/client/client'
import { emailRequestErrorMessage } from '../../session'

export const accountMessages = {
  wrongPassword: 'A senha atual não confere.',
  unavailable: 'Esta ação não está disponível agora.',
  sameEmail: 'Esse já é o seu e-mail.',
} as const

// Erro de uma ação da conta. `wrong-password` fica para o campo; o resto vira o aviso. Uma API
// anterior à feature responde 404 nestas rotas.
export function accountErrorMessage(error: unknown): string {
  if (error instanceof ApiRequestError && error.status === 404) return accountMessages.unavailable
  return emailRequestErrorMessage(error)
}

export function isWrongPassword(error: unknown): boolean {
  return error instanceof ApiRequestError && error.code === 'wrong-password'
}
