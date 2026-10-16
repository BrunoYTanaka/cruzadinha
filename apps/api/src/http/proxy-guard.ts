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
    if (typeof clientIp === 'string' && isIP(clientIp) !== 0) request.clientAddress = clientIp
  })
}

export const proxyGuard = fp(guard, { name: 'proxy-guard' })
