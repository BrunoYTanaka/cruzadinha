import cookie from '@fastify/cookie'
import Fastify from 'fastify'
import { describe, expect, it } from 'vitest'
import type { ServerConfig } from '../../../config'
import { clearSessionCookie, setSessionCookie } from './session-cookie'

const now = new Date('2026-10-13T12:00:00.000Z')
const expiresAt = new Date('2026-11-12T12:00:00.000Z')

async function setCookieHeader(nodeEnv: ServerConfig['nodeEnv'], clear = false): Promise<string> {
  const app = Fastify()
  await app.register(cookie)
  app.get('/', (_request, reply) => {
    if (clear) clearSessionCookie(reply)
    else setSessionCookie(reply, 'valor', expiresAt, now, nodeEnv)
    return reply.send('ok')
  })
  const response = await app.inject({ method: 'GET', url: '/' })
  await app.close()
  return String(response.headers['set-cookie'])
}

describe('session cookie', () => {
  it('is HttpOnly, SameSite=Lax, Path=/ and Secure in production', async () => {
    const header = await setCookieHeader('production')
    expect(header).toContain('sid=valor')
    expect(header).toContain('HttpOnly')
    expect(header).toContain('SameSite=Lax')
    expect(header).toContain('Path=/')
    expect(header).toContain('Secure')
    expect(header).toContain(`Max-Age=${30 * 24 * 60 * 60}`)
  })

  it.each(['development', 'test'] as const)('is not Secure in %s', async (nodeEnv) => {
    const header = await setCookieHeader(nodeEnv)
    expect(header).toContain('HttpOnly')
    expect(header).not.toContain('Secure')
  })

  it('expires the cookie on clear', async () => {
    const header = await setCookieHeader('production', true)
    expect(header).toContain('sid=;')
    expect(header).toMatch(/Expires=Thu, 01 Jan 1970/)
  })
})
