import type { FastifyInstance } from 'fastify'
import { buildApp } from '../app'
import { loadConfig } from '../config'
import type { Database } from '../db/client'
import type { Clock } from '../lib/clock'
import { hashPassword } from '../lib/password'
import { insertIfEmailFree } from '../modules/auth/users.repository'
import type { RateLimits } from '../modules/rate-limit/limits'
import type { EmailSender } from '../modules/email/types'
import type { PuzzleSource } from '../sources/types'

export function buildTestApp(options: {
  database: Database
  clock: Clock
  rateLimits?: RateLimits
  puzzleSources?: readonly PuzzleSource[]
  /** Envio de e-mail falso; sem ele os testes usam o log e nunca a rede. */
  emailSender?: EmailSender
  /** Com um destino de log, o nível sobe para `error` para o teste ler o que foi registrado. */
  logStream?: NodeJS.WritableStream
  /** Variáveis extras para a configuração (por exemplo, `PROXY_SECRET`). */
  env?: Record<string, string>
}): FastifyInstance {
  const { env, ...deps } = options
  const config = loadConfig({
    DATABASE_URL: 'postgres://nao-usado@localhost:1/db',
    NODE_ENV: 'test',
    LOG_LEVEL: options.logStream ? 'error' : 'fatal',
    // Cadastro aberto nos testes; quem testa o cadastro fechado passa `REGISTRATION_ENABLED: 'false'`.
    REGISTRATION_ENABLED: 'true',
    ...env,
  })
  return buildApp({
    config,
    probe: { check: async () => true, close: async () => {} },
    ...deps,
  })
}

export function sessionCookieFrom(setCookie: string | string[] | undefined): string | undefined {
  const headers = Array.isArray(setCookie) ? setCookie : setCookie ? [setCookie] : []
  for (const header of headers) {
    const match = /^sid=([^;]*)/.exec(header)
    if (match?.[1]) return match[1]
  }
  return undefined
}

// Conta pronta e sessão aberta para os testes que não tratam do cadastro (que agora só cria a
// conta depois de confirmar o e-mail, feature 035): grava o usuário direto e entra pelo login.
export async function signUpForTest(
  app: FastifyInstance,
  database: Database,
  email: string,
  password: string,
): Promise<string> {
  await insertIfEmailFree(database, { email, passwordHash: await hashPassword(password) })
  const response = await app.inject({
    method: 'POST',
    url: '/api/auth/login',
    payload: { email, password },
  })
  const sid = sessionCookieFrom(response.headers['set-cookie'])
  if (!sid) throw new Error('login sem cookie')
  return sid
}
