import { z } from 'zod'
import { afterEach, describe, expect, it, vi } from 'vitest'
import {
  ApiRequestError,
  apiRequest,
  apiRequestNoContent,
  getServerClockOffsetMs,
  resetServerClockOffset,
  setUnauthenticatedHandler,
} from './client'

const okSchema = z.object({ ok: z.literal(true) })

function respond(status: number, body?: unknown, headers: Record<string, string> = {}) {
  return vi.fn(
    async () =>
      new Response(body === undefined ? null : JSON.stringify(body), {
        status,
        headers: { 'content-type': 'application/json', ...headers },
      }),
  )
}

afterEach(() => {
  setUnauthenticatedHandler(null)
  resetServerClockOffset()
  vi.useRealTimers()
})

describe('apiRequest', () => {
  it('valida a resposta com o schema e envia o cookie da mesma origem', async () => {
    const fetch = respond(200, { ok: true })
    await expect(apiRequest('/api/x', okSchema, { fetch })).resolves.toEqual({ ok: true })
    expect(fetch).toHaveBeenCalledWith(
      '/api/x',
      expect.objectContaining({ credentials: 'same-origin', method: 'GET' }),
    )
  })

  it('envia o corpo como JSON', async () => {
    const fetch = respond(200, { ok: true })
    await apiRequest('/api/x', okSchema, { method: 'POST', body: { a: 1 }, fetch })
    expect(fetch).toHaveBeenCalledWith(
      '/api/x',
      expect.objectContaining({
        method: 'POST',
        body: '{"a":1}',
        headers: { 'content-type': 'application/json' },
      }),
    )
  })

  it('rejeita resposta fora do contrato sem mostrar o corpo', async () => {
    const fetch = respond(200, { ok: 'não' })
    await expect(apiRequest('/api/x', okSchema, { fetch })).rejects.toMatchObject({
      status: 200,
      code: undefined,
    })
  })

  it('lê o código de erro conhecido e os campos', async () => {
    const fetch = respond(400, { error: 'invalid-input', message: 'x', fields: ['email'] })
    await expect(apiRequest('/api/x', okSchema, { fetch })).rejects.toMatchObject({
      status: 400,
      code: 'invalid-input',
      fields: ['email'],
    })
  })

  it('lê o Retry-After em 429', async () => {
    const fetch = respond(
      429,
      { error: 'too-many-attempts', message: 'x' },
      { 'retry-after': '90' },
    )
    const error = await apiRequest('/api/x', okSchema, { fetch }).catch((e: unknown) => e)
    expect(error).toBeInstanceOf(ApiRequestError)
    expect(error).toMatchObject({ status: 429, code: 'too-many-attempts', retryAfterSeconds: 90 })
  })

  it('trata falha de rede como status 0', async () => {
    const fetch = vi.fn(async () => {
      throw new TypeError('Failed to fetch')
    })
    const error = await apiRequest('/api/x', okSchema, { fetch }).catch((e: unknown) => e)
    expect(error).toMatchObject({ status: 0 })
    expect((error as ApiRequestError).isOffline).toBe(true)
  })

  it('aceita 204 sem corpo', async () => {
    const fetch = vi.fn(async () => new Response(null, { status: 204 }))
    await expect(apiRequestNoContent('/api/x', { method: 'POST', fetch })).resolves.toBeUndefined()
  })
})

describe('401 unauthenticated', () => {
  const unauthenticated = { error: 'unauthenticated', message: 'x' }

  it('chama o tratador registrado', async () => {
    const handler = vi.fn()
    setUnauthenticatedHandler(handler)
    const fetch = respond(401, unauthenticated)
    await expect(apiRequest('/api/x', okSchema, { fetch })).rejects.toMatchObject({ status: 401 })
    expect(handler).toHaveBeenCalledTimes(1)
  })

  it('não chama o tratador quando a chamada trata o 401 por conta própria', async () => {
    const handler = vi.fn()
    setUnauthenticatedHandler(handler)
    const fetch = respond(401, unauthenticated)
    await expect(
      apiRequest('/api/x', okSchema, { fetch, skipUnauthenticatedHandler: true }),
    ).rejects.toMatchObject({ status: 401 })
    expect(handler).not.toHaveBeenCalled()
  })

  it('não chama o tratador em credenciais inválidas', async () => {
    const handler = vi.fn()
    setUnauthenticatedHandler(handler)
    const fetch = respond(401, { error: 'invalid-credentials', message: 'x' })
    await expect(apiRequest('/api/x', okSchema, { fetch })).rejects.toMatchObject({
      code: 'invalid-credentials',
    })
    expect(handler).not.toHaveBeenCalled()
  })
})

describe('desvio do relógio do servidor', () => {
  it('guarda a diferença entre o cabeçalho Date e o relógio do aparelho', async () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-10-14T12:10:00Z'))
    // o servidor está 10 minutos atrás do aparelho
    const fetch = respond(200, { ok: true }, { date: 'Wed, 14 Oct 2026 12:00:00 GMT' })
    await apiRequest('/api/x', okSchema, { fetch })
    // 10 minutos atrás, mais meio segundo (o cabeçalho `Date` é truncado em segundos)
    expect(getServerClockOffsetMs()).toBe(-10 * 60 * 1000 + 500)
  })

  it('ignora cabeçalho Date ausente ou inválido', async () => {
    const fetch = respond(200, { ok: true }, { date: 'ontem' })
    await apiRequest('/api/x', okSchema, { fetch })
    expect(getServerClockOffsetMs()).toBe(0)
  })
})
