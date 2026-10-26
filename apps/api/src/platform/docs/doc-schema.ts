import { apiErrorSchema, puzzleSourceIdSchema } from '@cruzadinha/shared'
import { z } from 'zod'

export type DocSchema = z.core.JSONSchema.JSONSchema

// Modo `output`: descreve as regras que a API aplica depois de normalizar a entrada
// (no e-mail, `format` e `maxLength` só existem na saída do `pipe`).
export function toDocSchema(schema: z.ZodType): DocSchema {
  const result: DocSchema = { ...z.toJSONSchema(schema, { io: 'output' }) }
  delete result.$schema
  return result
}

export function withFieldDescription(
  schema: DocSchema,
  field: string,
  description: string,
): DocSchema {
  const current = schema.properties?.[field]
  if (typeof current !== 'object') {
    throw new Error(`o schema não tem o campo ${field}`)
  }
  return {
    ...schema,
    properties: { ...schema.properties, [field]: { ...current, description } },
  }
}

export function errorResponse(description: string): DocSchema {
  return { description, ...toDocSchema(apiErrorSchema) }
}

export const retryAfterHeader = {
  'Retry-After': {
    type: 'integer',
    description: 'Segundos até a próxima tentativa ser aceita.',
  },
} satisfies Record<string, DocSchema>

export function setCookieHeader(description: string): Record<string, DocSchema> {
  return { 'Set-Cookie': { type: 'string', description } }
}

export const commonErrors = {
  503: errorResponse('`service-unavailable`: banco de dados fora do ar.'),
  500: errorResponse('`internal-error`: falha inesperada.'),
} satisfies Record<number, DocSchema>

// Sessão opcional em OpenAPI 3.1: o objeto vazio diz que a rota também atende sem sessão
// (visitante, feature 013).
export const optionalSessionSecurity: Record<string, string[]>[] = [{}, { session: [] }]

// Fonte opcional nas rotas de puzzle por data e de biblioteca (feature 014): sem ela vale O Globo.
export const sourceQueryProperty = {
  type: 'string',
  enum: [...puzzleSourceIdSchema.options],
  default: 'oglobo',
  description: 'Fonte da cruzada; sem ela vale O Globo (`oglobo`).',
} as const
