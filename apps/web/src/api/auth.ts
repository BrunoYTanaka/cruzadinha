import {
  authResponseSchema,
  registrationStatusSchema,
  type AuthResponse,
  type LoginRequest,
  type RegisterRequest,
  type RegistrationStatus,
} from '@cruzadinha/shared'
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

export function register(body: RegisterRequest): Promise<AuthResponse> {
  return apiRequest('/api/auth/register', authResponseSchema, {
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
