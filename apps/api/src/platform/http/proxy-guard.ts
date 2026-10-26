import { createHash, timingSafeEqual } from 'node:crypto'
import { isIP } from 'node:net'
import type { FastifyPluginAsync } from 'fastify'
import fp from 'fastify-plugin'
import { apiError } from './errors'

declare module 'fastify' {
  interface FastifyRequest {
    /** Endereço de quem acessa o site, usado pelos limites de tentativas. */
    clientAddress: string
  }
}

export type ProxyGuardOptions = { proxySecret: string | undefined }

const SECRET_HEADER = 'x-cruzadinha-proxy-secret'
const CLIENT_IP_HEADER = 'x-cruzadinha-client-ip'

function digest(value: string): Buffer {
  return createHash('sha256').update(value).digest()
}

// Quem usa IPv6 costuma ter um bloco /64 inteiro: contar o endereço completo deixaria trocar o fim
// dele a cada pedido e zerar os limites. O IPv6 conta pelos primeiros 64 bits; o IPv4 mapeado
// (::ffff:a.b.c.d) conta como o IPv4.
// '::ffff:1.2.3.4' vira '::ffff:102:304': o final em IPv4 ocupa dois grupos.
function withHexTail(ip: string): string {
  const dotted = /(\d+)\.(\d+)\.(\d+)\.(\d+)$/.exec(ip)
  if (!dotted) return ip
  const [a = 0, b = 0, c = 0, d = 0] = dotted.slice(1).map(Number)
  const hex = (high: number, low: number) => (high * 256 + low).toString(16)
  return `${ip.slice(0, dotted.index)}${hex(a, b)}:${hex(c, d)}`
}

export function limitKey(ip: string): string {
  if (isIP(ip) !== 6) return ip
  const [head = '', tail] = withHexTail(ip.toLowerCase()).split('::')
  const left = head ? head.split(':') : []
  const right = tail ? tail.split(':') : []
  const groups =
    tail === undefined
      ? left
      : [...left, ...Array(8 - left.length - right.length).fill('0'), ...right]
  if (groups.slice(0, 5).every((g) => /^0+$/.test(g)) && groups[5] === 'ffff') {
    const last = groups.slice(6)
    if (last.length === 2) {
      const [a = 0, b = 0] = last.map((g) => Number.parseInt(g, 16))
      return `${a >> 8}.${a & 255}.${b >> 8}.${b & 255}`
    }
    return groups[6] ?? ip
  }
  return `${groups
    .slice(0, 4)
    .map((g) => g.replace(/^0+(?=.)/, ''))
    .join(':')}::/64`
}

// Com PROXY_SECRET, a API só atende pedidos que passaram pelo repasse do site, e o endereço real
// vem do cabeçalho que só o repasse consegue definir (feature 012, research R3). O health check
// do provedor fica liberado. Sem PROXY_SECRET (desenvolvimento, testes), nada muda.
const guard: FastifyPluginAsync<ProxyGuardOptions> = async (app, { proxySecret }) => {
  app.decorateRequest('clientAddress', '')

  if (!proxySecret) {
    app.addHook('onRequest', async (request) => {
      request.clientAddress = request.ip
    })
    return
  }

  const expected = digest(proxySecret)
  app.addHook('onRequest', async (request, reply) => {
    request.clientAddress = request.ip
    if (request.method === 'GET' && request.url.split('?')[0] === '/api/health') return

    const received = request.headers[SECRET_HEADER]
    const ok = typeof received === 'string' && timingSafeEqual(digest(received), expected)
    if (!ok) {
      request.log.info({ reason: 'proxy-secret' }, 'pedido sem o segredo do repasse')
      reply.code(403).send(apiError('forbidden'))
      return reply
    }

    const clientIp = request.headers[CLIENT_IP_HEADER]
    if (typeof clientIp === 'string' && isIP(clientIp) !== 0) {
      request.clientAddress = limitKey(clientIp)
    }
  })
}

export const proxyGuard = fp(guard, { name: 'proxy-guard' })
