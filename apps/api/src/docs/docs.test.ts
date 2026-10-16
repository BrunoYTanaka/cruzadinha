import SwaggerParser from '@apidevtools/swagger-parser'
import {
  authResponseSchema,
  puzzleResponseSchema,
  libraryResponseSchema,
  loginRequestSchema,
  progressEnvelopeSchema,
  registerRequestSchema,
  registrationStatusSchema,
  saveProgressRequestSchema,
} from '@cruzadinha/shared'
import type { FastifyInstance } from 'fastify'
import { afterAll, afterEach, describe, expect, it } from 'vitest'
import { z } from 'zod'
import { buildApp } from '../app'
import { loadConfig } from '../config'
import { createDatabase } from '../db/client'
import { buildSamplePuzzle } from '../db/seed-puzzle'
import type { DatabaseProbe } from '../db/probe'
import { toDocSchema } from './doc-schema'

const probe: DatabaseProbe = { check: async () => false, close: async () => {} }

// Nunca consultado: o cliente do postgres.js só conecta na primeira consulta. Também prova
// que a documentação não depende do banco.
const testDatabase = createDatabase('postgres://user:SEGREDO@localhost:1/db')

function build(nodeEnv: 'development' | 'production' = 'development'): FastifyInstance {
  const config = loadConfig({
    DATABASE_URL: 'postgres://user:SEGREDO@localhost:5432/db',
    LOG_LEVEL: 'fatal',
    NODE_ENV: nodeEnv,
  })
  return buildApp({ config, probe, database: testDatabase.db })
}

const mediaSchema = z.looseObject({ schema: z.unknown(), example: z.unknown().optional() })
const operationSchema = z.looseObject({
  tags: z.array(z.string()).optional(),
  summary: z.string().optional(),
  security: z.array(z.record(z.string(), z.array(z.string()))).optional(),
  requestBody: z.looseObject({ content: z.record(z.string(), mediaSchema) }).optional(),
  responses: z.record(
    z.string(),
    z.looseObject({ content: z.record(z.string(), mediaSchema).optional() }),
  ),
})
const documentSchema = z.looseObject({
  openapi: z.string(),
  paths: z.record(z.string(), z.record(z.string(), operationSchema)),
  components: z
    .looseObject({ securitySchemes: z.record(z.string(), z.unknown()).optional() })
    .optional(),
})
type Operation = z.infer<typeof operationSchema>

async function documentOf(instance: FastifyInstance) {
  await instance.ready()
  return documentSchema.parse(instance.swagger())
}

function operation(doc: z.infer<typeof documentSchema>, method: string, path: string): Operation {
  const found = doc.paths[path]?.[method]
  if (!found) throw new Error(`${method.toUpperCase()} ${path} não está no documento`)
  return found
}

function operationKeys(doc: z.infer<typeof documentSchema>): string[] {
  return Object.entries(doc.paths)
    .flatMap(([path, methods]) => Object.keys(methods).map((m) => `${m.toUpperCase()} ${path}`))
    .sort()
}

// Nomes de propriedade em qualquer `properties` do valor, em qualquer profundidade.
function propertyNames(value: unknown): string[] {
  if (Array.isArray(value)) return value.flatMap(propertyNames)
  if (typeof value !== 'object' || value === null) return []
  return Object.entries(value).flatMap(([key, child]) => [
    ...(key === 'properties' && typeof child === 'object' && child !== null
      ? Object.keys(child)
      : []),
    ...propertyNames(child),
  ])
}

const catalog = [
  'GET /api/auth/me',
  'GET /api/auth/registration',
  'GET /api/health',
  'GET /api/library',
  'GET /api/progress/{puzzleId}',
  'GET /api/puzzles',
  'GET /api/puzzles/{id}',
  'POST /api/auth/login',
  'POST /api/auth/logout',
  'POST /api/auth/register',
  'POST /api/progress/{puzzleId}/reset',
  'PUT /api/progress/{puzzleId}',
]

let app: FastifyInstance | undefined

afterEach(async () => {
  await app?.close()
  app = undefined
})

afterAll(async () => {
  await testDatabase.close()
})

describe('documentação em produção', () => {
  it.each(['/api/docs', '/api/docs/', '/api/docs/json', '/api/docs/yaml'])(
    'GET %s responde como um caminho inexistente',
    async (url) => {
      app = build('production')
      const notFound = (await app.inject({ method: 'GET', url: '/api/outra' })).json<{
        message: string
      }>()
      const response = await app.inject({ method: 'GET', url })

      expect(response.statusCode).toBe(404)
      expect(response.json()).toEqual({
        ...notFound,
        message: notFound.message.replace('/api/outra', url),
      })
    },
  )

  it('mantém as rotas da API', async () => {
    app = build('production')
    const response = await app.inject({ method: 'GET', url: '/api/health' })

    expect(response.statusCode).toBe(200)
  })
})

describe('página de documentação', () => {
  it('serve a Swagger UI sem recursos de terceiros', async () => {
    app = build()
    const page = await app.inject({ method: 'GET', url: '/api/docs/' })
    const initializer = await app.inject({
      method: 'GET',
      url: '/api/docs/static/swagger-initializer.js',
    })

    expect(page.statusCode).toBe(200)
    expect(page.headers['content-type']).toContain('text/html')
    expect(initializer.statusCode).toBe(200)
    // A página só carrega arquivos da própria origem.
    expect(page.body).not.toMatch(/(?:src|href)=["']?(?:https?:)?\/\//)
    // Fora dos comentários (o pacote traz um link num comentário), nenhum endereço externo.
    const initializerCode = initializer.body.replace(/^\s*\/\/.*$/gm, '')
    expect(initializerCode).not.toMatch(/https?:\/\//)
    expect(initializer.body).toMatch(/validatorUrl: null/)
  })
})

describe('documento OpenAPI', () => {
  it('lista exatamente as operações públicas, cada uma com uma tag', async () => {
    app = build()
    const doc = await documentOf(app)

    expect(operationKeys(doc)).toEqual(catalog)
    for (const key of catalog) {
      const [method = '', path = ''] = key.split(' ')
      const op = operation(doc, method.toLowerCase(), path)
      expect(op.tags).toHaveLength(1)
      expect(['health', 'auth', 'puzzles', 'progress', 'library']).toContain(op.tags?.[0])
      expect(op.summary).toBeTruthy()
    }
  })

  it.each(['/api/auth/register', '/api/auth/login'])(
    'POST %s tem corpo com exemplo',
    async (path) => {
      app = build()
      const doc = await documentOf(app)
      const media = operation(doc, 'post', path).requestBody?.content['application/json']

      expect(media?.example ?? exampleOf(media?.schema)).toBeDefined()
    },
  )

  it.each([
    ['/api/puzzles', 'a data'],
    ['/api/puzzles/{id}', 'o id'],
  ])('GET %s documenta a solution na resposta 200 (%s)', async (path) => {
    app = build()
    const doc = await documentOf(app)
    const ok = operation(doc, 'get', path).responses['200']

    expect(propertyNames(ok)).toContain('solution')
  })

  it('não contém segredos, credenciais do .env.example nem hash de senha', async () => {
    app = build()
    const doc = await documentOf(app)
    const serialized = JSON.stringify(doc)

    for (const secret of [
      'dev@cruzadinha.local',
      'senha-de-teste-123',
      'cruzadinha:cruzadinha',
      'SEGREDO',
    ]) {
      expect(serialized).not.toContain(secret)
    }
    // Os exemplos do documento nunca trazem as letras de um puzzle (nem do exemplo do seed).
    expect(serialized).not.toContain(JSON.stringify(buildSamplePuzzle('2026-10-13').solution.cells))
    for (const forbidden of ['passwordHash', 'hash', 'tokenHash']) {
      expect(propertyNames(doc)).not.toContain(forbidden)
    }
    const responses = Object.values(doc.paths).flatMap((methods) =>
      Object.values(methods).map((op) => op.responses),
    )
    expect(propertyNames(responses)).not.toContain('password')
  })
})

describe('documento para ferramentas', () => {
  it('é servido em JSON e YAML', async () => {
    app = build()
    const doc = await documentOf(app)
    const json = await app.inject({ method: 'GET', url: '/api/docs/json' })
    const yaml = await app.inject({ method: 'GET', url: '/api/docs/yaml' })

    expect(json.statusCode).toBe(200)
    expect(json.headers['content-type']).toContain('application/json')
    expect(documentSchema.parse(json.json())).toMatchObject({ openapi: '3.1.0', paths: doc.paths })
    expect(yaml.statusCode).toBe(200)
    expect(yaml.body).toMatch(/^openapi: 3\.1\.0$/m)
  })

  it('é válido no OpenAPI 3.1, sem $ref externo', async () => {
    app = build()
    await app.ready()
    const doc = app.swagger()

    // O parser altera o objeto que recebe; a cópia mantém o cache do plugin intacto.
    await expect(SwaggerParser.validate(structuredClone(doc))).resolves.toBeDefined()
    expect(JSON.stringify(doc)).not.toMatch(/"\$ref":"https?:/)
  })
})

describe('sessão', () => {
  const protectedOperations = [
    'GET /api/auth/me',
    'GET /api/progress/{puzzleId}',
    'PUT /api/progress/{puzzleId}',
    'POST /api/progress/{puzzleId}/reset',
  ]
  // Abertas a visitantes (feature 013): a sessão é opcional.
  const optionalSessionOperations = [
    'GET /api/puzzles',
    'GET /api/puzzles/{id}',
    'GET /api/library',
  ]

  it('declara o cookie de sessão como esquema de segurança', async () => {
    app = build()
    const doc = await documentOf(app)

    expect(doc.components?.securitySchemes?.session).toMatchObject({
      type: 'apiKey',
      in: 'cookie',
      name: 'sid',
    })
  })

  it.each(catalog)('%s indica corretamente se exige sessão', async (key) => {
    app = build()
    const doc = await documentOf(app)
    const [method = '', path = ''] = key.split(' ')
    const op = operation(doc, method.toLowerCase(), path)

    if (protectedOperations.includes(key)) {
      expect(op.security).toEqual([{ session: [] }])
      expect(op.responses).toHaveProperty('401')
    } else if (optionalSessionOperations.includes(key)) {
      expect(op.security).toEqual([{}, { session: [] }])
      expect(op.responses).toHaveProperty('401')
    } else {
      expect(op.security).toBeUndefined()
    }
  })
})

type CollectedRoute = { key: string; documented: boolean }

// Coleta as rotas `/api/*` (fora de `/api/docs`) assim que são registradas. O hook precisa
// entrar antes de qualquer rota extra e antes do `ready()`, quando os plugins de rota carregam.
function collectRoutes(instance: FastifyInstance): CollectedRoute[] {
  const routes: CollectedRoute[] = []
  instance.addHook('onRoute', ({ method, url, schema }) => {
    if (!url.startsWith('/api/') || url.startsWith('/api/docs')) return
    for (const verb of [method].flat()) {
      if (verb === 'HEAD') continue
      routes.push({
        // O Fastify escreve parâmetros como `:id`; o OpenAPI, como `{id}`.
        key: `${verb} ${url.replace(/:(\w+)/g, '{$1}')}`,
        documented: Boolean(schema?.tags && schema.summary && schema.response),
      })
    }
  })
  return routes
}

async function undocumentedRoutes(
  instance: FastifyInstance,
  routes: CollectedRoute[],
): Promise<string[]> {
  const documentedPaths = operationKeys(await documentOf(instance))
  return routes
    .filter(({ key, documented }) => !documented || !documentedPaths.includes(key))
    .map(({ key }) => key)
}

describe('cobertura da documentação', () => {
  it('todas as rotas da API estão documentadas', async () => {
    app = build()
    const routes = collectRoutes(app)

    expect(await undocumentedRoutes(app, routes)).toEqual([])
    expect(routes.map(({ key }) => key).sort()).toEqual(catalog)
  })

  it('acusa uma rota nova sem documentação', async () => {
    app = build()
    const routes = collectRoutes(app)
    app.get('/api/x', async () => ({}))

    expect(await undocumentedRoutes(app, routes)).toEqual(['GET /api/x'])
  })
})

// Tira o que só a camada de documentação acrescenta e iguala `const: x` a `enum: [x]`,
// que o @fastify/swagger converte por padrão.
function normalized(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(normalized)
  if (typeof value !== 'object' || value === null) return value
  const entries = Object.entries(value)
    .filter(([key]) => !['description', 'examples', 'example'].includes(key))
    .map(([key, child]) => (key === 'const' ? ['enum', [child]] : [key, normalized(child)]))
  return Object.fromEntries(entries)
}

describe('documentação vinda das regras de validação', () => {
  it.each([
    ['/api/auth/register', registerRequestSchema],
    ['/api/auth/login', loginRequestSchema],
  ] as const)('o corpo de POST %s é o do schema Zod da rota', async (path, schema) => {
    app = build()
    const doc = await documentOf(app)
    const media = operation(doc, 'post', path).requestBody?.content['application/json']

    expect(normalized(media?.schema)).toEqual(normalized(toDocSchema(schema)))
    expect(schema.safeParse(media?.example ?? exampleOf(media?.schema)).success).toBe(true)
  })

  it('o corpo de PUT /api/progress/{puzzleId} é o do schema Zod e traz um exemplo válido', async () => {
    app = build()
    const doc = await documentOf(app)
    const media = operation(doc, 'put', '/api/progress/{puzzleId}').requestBody?.content[
      'application/json'
    ]

    expect(normalized(media?.schema)).toEqual(normalized(toDocSchema(saveProgressRequestSchema)))
    expect(
      saveProgressRequestSchema.safeParse(media?.example ?? exampleOf(media?.schema)).success,
    ).toBe(true)
  })

  it('a resposta de GET /api/library traz um exemplo válido', async () => {
    app = build()
    const doc = await documentOf(app)
    const media = operation(doc, 'get', '/api/library').responses['200']?.content?.[
      'application/json'
    ]

    expect(
      libraryResponseSchema.safeParse(
        z.looseObject({ example: z.unknown() }).parse(media?.schema).example,
      ).success,
    ).toBe(true)
  })

  it.each([
    ['get', '/api/auth/me', '200', authResponseSchema],
    ['get', '/api/auth/registration', '200', registrationStatusSchema],
    ['get', '/api/puzzles', '200', puzzleResponseSchema],
    ['get', '/api/puzzles/{id}', '200', puzzleResponseSchema],
    ['get', '/api/progress/{puzzleId}', '200', progressEnvelopeSchema],
    ['put', '/api/progress/{puzzleId}', '200', progressEnvelopeSchema],
    ['post', '/api/progress/{puzzleId}/reset', '200', progressEnvelopeSchema],
    ['get', '/api/library', '200', libraryResponseSchema],
  ] as const)('a resposta de %s %s é a do schema Zod', async (method, path, status, schema) => {
    app = build()
    const doc = await documentOf(app)
    const media = operation(doc, method, path).responses[status]?.content?.['application/json']

    expect(normalized(media?.schema)).toEqual(normalized(toDocSchema(schema)))
  })
})

describe('não regressão das rotas', () => {
  it('o schema do corpo não valida antes da rota', async () => {
    app = build()
    const response = await app.inject({
      method: 'POST',
      url: '/api/auth/login',
      payload: { email: 'invalido', password: 'x', extra: 1 },
    })

    expect(response.statusCode).toBe(400)
    expect(response.json()).toMatchObject({ error: 'invalid-input', fields: ['email', 'body'] })
  })
})

function exampleOf(schema: unknown): unknown {
  return z.looseObject({ examples: z.array(z.unknown()).min(1) }).safeParse(schema).data
    ?.examples[0]
}
