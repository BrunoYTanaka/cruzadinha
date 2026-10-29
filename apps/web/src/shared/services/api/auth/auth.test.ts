import { afterEach, describe, expect, it, vi } from 'vitest'
import { apiError, jsonResponse, mockApi } from '../../../../test/http'
import { forgotPassword, getMe, getRegistration, register, resendVerification } from './auth'
import { ApiRequestError, setUnauthenticatedHandler } from '../client/client'

const user = { id: '0b9a3a4e-6d0e-4b6c-9a52-1f2e3d4c5b6a', email: 'ana@exemplo.com' }

afterEach(() => {
  setUnauthenticatedHandler(null)
  vi.unstubAllGlobals()
})

describe('getMe', () => {
  it('devolve a conta com sessão', async () => {
    mockApi({ 'GET /api/auth/me': () => jsonResponse(200, { user }) })
    await expect(getMe()).resolves.toEqual({ user })
  })

  it('devolve null sem sessão, sem chamar o tratador de 401', async () => {
    const handler = vi.fn()
    setUnauthenticatedHandler(handler)
    mockApi({ 'GET /api/auth/me': () => apiError(401, 'unauthenticated') })
    await expect(getMe()).resolves.toBeNull()
    expect(handler).not.toHaveBeenCalled()
  })

  it('lança nos outros erros', async () => {
    mockApi({ 'GET /api/auth/me': () => apiError(500, 'internal-error') })
    await expect(getMe()).rejects.toBeInstanceOf(ApiRequestError)
  })
})

describe('getRegistration', () => {
  it('lê se o cadastro está aberto', async () => {
    mockApi({ 'GET /api/auth/registration': () => jsonResponse(200, { open: true }) })
    await expect(getRegistration()).resolves.toEqual({ open: true, captchaRequired: false })
  })
})

describe('captchaToken nos pedidos de e-mail (feature 049)', () => {
  const cases = [
    ['POST /api/auth/register', register],
    ['POST /api/auth/resend-verification', resendVerification],
    ['POST /api/auth/forgot-password', forgotPassword],
  ] as const

  it.each(cases)('%s leva a prova no corpo quando existe', async (key, call) => {
    const { calls } = mockApi({ [key]: () => jsonResponse(202, { retryAfter: 60 }) })
    await call({ email: 'ana@exemplo.com', captchaToken: 'prova' })
    expect(calls[0]?.body).toEqual({ email: 'ana@exemplo.com', captchaToken: 'prova' })
  })

  it.each(cases)('%s omite a chave quando não há prova', async (key, call) => {
    const { calls } = mockApi({ [key]: () => jsonResponse(202, { retryAfter: 60 }) })
    await call({ email: 'ana@exemplo.com' })
    expect(calls[0]?.body).toEqual({ email: 'ana@exemplo.com' })
  })
})
