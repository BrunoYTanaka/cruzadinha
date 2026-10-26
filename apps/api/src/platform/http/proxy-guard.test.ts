import { randomBytes } from 'node:crypto'
import { Writable } from 'node:stream'
import Fastify from 'fastify'
import { describe, expect, it } from 'vitest'
import { limitKey, proxyGuard } from './proxy-guard'

const SECRET = randomBytes(24).toString('hex')

function buildGuarded(proxySecret: string | undefined) {
  const lines: string[] = []
  const stream = new Writable({
    write(chunk, _encoding, done) {
      lines.push(String(chunk))
      done()
    },
  })
  const app = Fastify({ logger: { level: 'info', stream } })
  app.register(proxyGuard, { proxySecret })
  app.register(async (scoped) => {
    scoped.get('/api/health', (request) => ({ address: request.clientAddress }))
    scoped.get('/api/eco', (request) => ({ address: request.clientAddress }))
  })
  return { app, lines }
}

describe('proxyGuard with PROXY_SECRET', () => {
  it('lets the health check through without the header', async () => {
    const { app } = buildGuarded(SECRET)
    const response = await app.inject({ url: '/api/health' })
    expect(response.statusCode).toBe(200)
  })

  it('refuses any other request without the secret', async () => {
    const { app } = buildGuarded(SECRET)
    const response = await app.inject({ url: '/api/eco' })
    expect(response.statusCode).toBe(403)
    expect(response.json()).toEqual({ error: 'forbidden', message: 'Acesso negado.' })
  })

  it.each([
    ['same length', 'x'.repeat(SECRET.length)],
    ['different length', 'curto'],
  ])('refuses a wrong secret (%s)', async (_label, wrong) => {
    const { app } = buildGuarded(SECRET)
    const response = await app.inject({
      url: '/api/eco',
      headers: { 'x-cruzadinha-proxy-secret': wrong },
    })
    expect(response.statusCode).toBe(403)
  })

  it('accepts the right secret', async () => {
    const { app } = buildGuarded(SECRET)
    const response = await app.inject({
      url: '/api/eco',
      headers: { 'x-cruzadinha-proxy-secret': SECRET },
    })
    expect(response.statusCode).toBe(200)
  })

  it('uses the client IP sent by the proxy', async () => {
    const { app } = buildGuarded(SECRET)
    const response = await app.inject({
      url: '/api/eco',
      headers: { 'x-cruzadinha-proxy-secret': SECRET, 'x-cruzadinha-client-ip': '203.0.113.7' },
    })
    expect(response.json()).toEqual({ address: '203.0.113.7' })
  })

  it('falls back to the socket address when the client IP is not an IP', async () => {
    const { app } = buildGuarded(SECRET)
    const response = await app.inject({
      url: '/api/eco',
      headers: { 'x-cruzadinha-proxy-secret': SECRET, 'x-cruzadinha-client-ip': 'lixo' },
    })
    expect(response.json()).toEqual({ address: '127.0.0.1' })
  })

  it('does not log the value it received', async () => {
    const { app, lines } = buildGuarded(SECRET)
    await app.inject({ url: '/api/eco', headers: { 'x-cruzadinha-proxy-secret': 'VALOR-ENVIADO' } })
    expect(lines.join('')).toContain('pedido sem o segredo do repasse')
    expect(lines.join('')).not.toContain('VALOR-ENVIADO')
  })
})

describe('proxyGuard without PROXY_SECRET', () => {
  it('lets everything through and ignores the client IP header', async () => {
    const { app } = buildGuarded(undefined)
    const response = await app.inject({
      url: '/api/eco',
      headers: { 'x-cruzadinha-client-ip': '203.0.113.7' },
    })
    expect(response.statusCode).toBe(200)
    expect(response.json()).toEqual({ address: '127.0.0.1' })
  })
})

describe('limitKey', () => {
  it.each([
    ['203.0.113.7', '203.0.113.7'],
    ['2001:db8:1:2:aaaa::1', '2001:db8:1:2::/64'],
    ['2001:DB8:1:2:bbbb:0:0:9', '2001:db8:1:2::/64'],
    ['2001:db8::1', '2001:db8:0:0::/64'],
    ['::1', '0:0:0:0::/64'],
    ['::ffff:203.0.113.5', '203.0.113.5'],
    ['::ffff:cb00:7106', '203.0.113.6'],
  ])('%s -> %s', (ip, key) => {
    expect(limitKey(ip)).toBe(key)
  })
})
