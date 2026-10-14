import {
  authResponseSchema,
  type AuthResponse,
  type LoginRequest,
  type RegisterRequest,
} from '@cruzadinha/shared'
import { apiRequest, apiRequestNoContent } from './client'

// A guarda de sessão e as telas de login tratam o 401 por conta própria.
export function getMe(): Promise<AuthResponse> {
  return apiRequest('/api/auth/me', authResponseSchema, { skipUnauthenticatedHandler: true })
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
