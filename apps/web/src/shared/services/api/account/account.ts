import {
  emailRequestAcceptedSchema,
  type ChangeEmailRequest,
  type ChangePasswordRequest,
  type ConfirmEmailChangeRequest,
  type DeleteAccountRequest,
  type EmailRequestAccepted,
} from '@cruzadinha/shared'
import { z } from 'zod'
import { apiRequest } from '../client/client'

const emptySchema = z.object({})

// Gestão da conta (feature 042). Senha errada é `400 wrong-password`, nunca 401: o 401 é sessão
// encerrada e vai para o tratador de sempre.
export async function changePassword(body: ChangePasswordRequest): Promise<void> {
  await apiRequest('/api/auth/change-password', emptySchema, { method: 'POST', body })
}

export async function logoutOthers(): Promise<void> {
  await apiRequest('/api/auth/logout-others', emptySchema, { method: 'POST', body: {} })
}

export function changeEmail(body: ChangeEmailRequest): Promise<EmailRequestAccepted> {
  return apiRequest('/api/auth/change-email', emailRequestAcceptedSchema, {
    method: 'POST',
    body,
  })
}

// O link é a prova de posse: funciona sem sessão e um 401 não é "sessão encerrada".
export async function confirmEmailChange(body: ConfirmEmailChangeRequest): Promise<void> {
  await apiRequest('/api/auth/confirm-email-change', emptySchema, {
    method: 'POST',
    body,
    skipUnauthenticatedHandler: true,
  })
}

export async function deleteAccount(body: DeleteAccountRequest): Promise<void> {
  await apiRequest('/api/auth/delete-account', emptySchema, { method: 'POST', body })
}
