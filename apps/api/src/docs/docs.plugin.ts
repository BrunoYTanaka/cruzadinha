import swagger from '@fastify/swagger'
import swaggerUi from '@fastify/swagger-ui'
import fp from 'fastify-plugin'
import { z } from 'zod'
import packageJson from '../../package.json' with { type: 'json' }
import { SESSION_COOKIE } from '../modules/auth/session-cookie'

const { version } = z.object({ version: z.string().min(1) }).parse(packageJson)

// Só é registrado fora de produção (app.ts). O `fp` tira o encapsulamento: sem ele, o hook
// `onRoute` do @fastify/swagger não veria as rotas registradas depois, em `buildApp`.
export default fp(async (app) => {
  await app.register(swagger, {
    openapi: {
      openapi: '3.1.0',
      info: {
        title: 'Cruzadinha API',
        version,
        description:
          'API de uso privado da Cruzadinha. A sessão é um cookie emitido pelo login ou cadastro, ' +
          'e as execuções feitas por esta página contam nos limites de tentativas como as de ' +
          'qualquer outro cliente.',
      },
      tags: [
        { name: 'health', description: 'Saúde da API e do banco de dados' },
        { name: 'auth', description: 'Cadastro por convite, login, logout e sessão' },
        { name: 'invites', description: 'Convites gerados pela conta autenticada' },
      ],
      components: {
        securitySchemes: {
          session: {
            type: 'apiKey',
            in: 'cookie',
            name: SESSION_COOKIE,
            description:
              'Cookie `HttpOnly` emitido pelo login ou cadastro. Na mesma origem, o navegador o ' +
              'envia sozinho: não é preciso usar o botão Authorize.',
          },
        },
      },
    },
  })
  // Arquivos da UI vêm do próprio pacote, sem CDN; o validador online já vem desligado.
  await app.register(swaggerUi, {
    routePrefix: '/api/docs',
    uiConfig: { tryItOutEnabled: true },
  })
})
