import {
  authResponseSchema,
  emailRequestAcceptedSchema,
  registrationStatusSchema,
  type AuthResponse,
  type EmailRequestAccepted,
  type ForgotPasswordRequest,
  type LoginRequest,
  type RegisterRequest,
  type RegistrationStatus,
  type ResendVerificationRequest,
  type ResetPasswordRequest,
  type VerifyEmailRequest,
} from '@cruzadinha/shared'
import { z } from 'zod'
import { ApiRequestError, apiRequest, apiRequestNoContent } from './client'

// Sem sessão a pessoa é visitante (feature 013): o 401 vira `null` e não chama o tratador de 401.
export async function getMe(): Promise<AuthResponse | null> {
  try {
    return await apiRequest('/api/auth/me', authResponseSchema, {
      skipUnauthenticatedHandler: true,
    })
  } catch (error) {
    if (error instanceof ApiRequestError && error.status === 401) return null
    throw error
  }
}

// Se o cadastro está aberto (chave da API). Quem chama trata qualquer falha como fechado.
export function getRegistration(): Promise<RegistrationStatus> {
  return apiRequest('/api/auth/registration', registrationStatusSchema)
}

export function login(body: LoginRequest): Promise<AuthResponse> {
  return apiRequest('/api/auth/login', authResponseSchema, {
    method: 'POST',
    body,
    skipUnauthenticatedHandler: true,
  })
}

// O cadastro só pede o link de confirmação: não cria conta nem sessão (feature 034).
export function register(body: RegisterRequest): Promise<EmailRequestAccepted> {
  return apiRequest('/api/auth/register', emailRequestAcceptedSchema, {
    method: 'POST',
    body,
    skipUnauthenticatedHandler: true,
  })
}

export function resendVerification(body: ResendVerificationRequest): Promise<EmailRequestAccepted> {
  return apiRequest('/api/auth/resend-verification', emailRequestAcceptedSchema, {
    method: 'POST',
    body,
    skipUnauthenticatedHandler: true,
  })
}

const emptySchema = z.object({})

// A senha é escolhida aqui, por quem abriu o link (feature 034).
export async function verifyEmail(body: VerifyEmailRequest): Promise<void> {
  await apiRequest('/api/auth/verify-email', emptySchema, {
    method: 'POST',
    body,
    skipUnauthenticatedHandler: true,
  })
}

export function forgotPassword(body: ForgotPasswordRequest): Promise<EmailRequestAccepted> {
  return apiRequest('/api/auth/forgot-password', emailRequestAcceptedSchema, {
    method: 'POST',
    body,
    skipUnauthenticatedHandler: true,
  })
}

export async function resetPassword(body: ResetPasswordRequest): Promise<void> {
  await apiRequest('/api/auth/reset-password', emptySchema, {
    method: 'POST',
    body,
    skipUnauthenticatedHandler: true,
  })
}

export function logout(): Promise<void> {
  return apiRequestNoContent('/api/auth/logout', {
    method: 'POST',
    skipUnauthenticatedHandler: true,
  })
}
