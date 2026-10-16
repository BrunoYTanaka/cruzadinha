// @vitest-environment node
import { describe, expect, it, vi } from 'vitest'
import { proxyRequest } from './proxy'

const SECRET = 'segredo-de-teste-'.repeat(3)
const env = { API_ORIGIN: 'https://api.example', PROXY_SECRET: SECRET }

function capture(response: Response = new Response('{}', { status: 200 })) {
  const calls: Request[] = []
  const fetchImpl = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
    calls.push(new Request(input, init))
    return response.clone()
  })
  return { calls, fetchImpl: fetchImpl as unknown as typeof fetch }
}

function browserRequest(path: string, init: RequestInit = {}): Request {
  return new Request(`https://site.example${path}`, init)
}

describe('proxyRequest', () => {
  it('builds the URL from API_ORIGIN, path and query', async () => {
    const { calls, fetchImpl } = capture()
    await proxyRequest(browserRequest('/api/puzzles?level=daily&date=2026-10-01'), env, fetchImpl)
    expect(calls[0]?.url).toBe('https://api.example/api/puzzles?level=daily&date=2026-10-01')
  })

  it('forwards method, body and cookie', async () => {
    const { calls, fetchImpl } = capture()
    await proxyRequest(
      browserRequest('/api/progress/x', {
        method: 'PUT',
        body: JSON.stringify({ a: 1 }),
        headers: { 'content-type': 'application/json', cookie: 'sid=abc' },
      }),
      env,
      fetchImpl,
    )
    const sent = calls[0]
    expect(sent?.method).toBe('PUT')
    expect(await sent?.text()).toBe('{"a":1}')
    expect(sent?.headers.get('cookie')).toBe('sid=abc')
  })

  it('drops x-cruzadinha headers from the browser and adds its own', async () => {
    const { calls, fetchImpl } = capture()
    await proxyRequest(
      browserRequest('/api/auth/login', {
        method: 'POST',
        headers: {
          'x-cruzadinha-client-ip': '6.6.6.6',
          'x-cruzadinha-proxy-secret': 'inventado',
          'cf-connecting-ip': '203.0.113.9',
        },
      }),
      env,
      fetchImpl,
    )
    const headers = calls[0]?.headers
    expect(headers?.get('x-cruzadinha-client-ip')).toBe('203.0.113.9')
    expect(headers?.get('x-cruzadinha-proxy-secret')).toBe(SECRET)
    expect(headers?.get('host')).not.toBe('site.example')
  })

  it('does not follow redirects', async () => {
    const fetchImpl = vi.fn<typeof fetch>(async () => new Response(null, { status: 200 }))
    await proxyRequest(browserRequest('/api/health'), env, fetchImpl)
    expect(fetchImpl.mock.calls[0]?.[1]).toMatchObject({ redirect: 'manual' })
  })

  it('returns the API response as it came, cookies included', async () => {
    const headers = new Headers({ 'content-type': 'application/json', 'retry-after': '90' })
    headers.append('set-cookie', 'sid=novo; HttpOnly; Path=/')
    const { fetchImpl } = capture(new Response('{"ok":true}', { status: 429, headers }))
    const response = await proxyRequest(browserRequest('/api/auth/login'), env, fetchImpl)
    expect(response.status).toBe(429)
    expect(response.headers.get('retry-after')).toBe('90')
    expect(response.headers.get('set-cookie')).toContain('sid=novo')
    expect(await response.text()).toBe('{"ok":true}')
  })

  async function expectWaking(response: Response) {
    expect(response.status).toBe(503)
    expect(response.headers.get('retry-after')).toBe('5')
    expect(await response.json()).toEqual({
      error: 'service-unavailable',
      message: 'O servidor está acordando. Tente de novo em instantes.',
    })
  }

  it('turns an HTML answer (provider waking page) into a 503', async () => {
    const { fetchImpl } = capture(
      new Response('<html>acordando</html>', { headers: { 'content-type': 'text/html' } }),
    )
    await expectWaking(await proxyRequest(browserRequest('/api/health'), env, fetchImpl))
  })

  it('turns a connection failure into a 503', async () => {
    const fetchImpl = vi.fn(async () => {
      throw new TypeError('connection refused')
    })
    await expectWaking(
      await proxyRequest(browserRequest('/api/health'), env, fetchImpl as unknown as typeof fetch),
    )
  })

  it.each([
    {},
    { API_ORIGIN: 'https://api.example' },
    { PROXY_SECRET: SECRET },
    { API_ORIGIN: 'não é url', PROXY_SECRET: SECRET },
    { API_ORIGIN: 'http://api.example', PROXY_SECRET: SECRET },
    { API_ORIGIN: 'https://api.example', PROXY_SECRET: 'curto' },
    { API_ORIGIN: 1, PROXY_SECRET: SECRET },
  ])('answers 503 without calling the API when env is %j', async (badEnv) => {
    const error = vi.spyOn(console, 'error').mockImplementation(() => {})
    const fetchImpl = vi.fn()
    await expectWaking(
      await proxyRequest(
        browserRequest('/api/health'),
        badEnv,
        fetchImpl as unknown as typeof fetch,
      ),
    )
    expect(fetchImpl).not.toHaveBeenCalled()
    expect(JSON.stringify(error.mock.calls)).not.toContain(SECRET)
    error.mockRestore()
  })

  it('never puts the secret in the response', async () => {
    const { fetchImpl } = capture(new Response('ok', { status: 200 }))
    const response = await proxyRequest(browserRequest('/api/health'), env, fetchImpl)
    const dump = JSON.stringify([...response.headers]) + (await response.text())
    expect(dump).not.toContain(SECRET)
  })
})
