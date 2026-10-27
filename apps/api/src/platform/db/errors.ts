const CONNECTION_CODES = new Set([
  'ECONNREFUSED',
  'ECONNRESET',
  'ENOTFOUND',
  'ETIMEDOUT',
  'EAI_AGAIN',
  'CONNECT_TIMEOUT',
  'CONNECTION_CLOSED',
  'CONNECTION_ENDED',
  'CONNECTION_DESTROYED',
  // Postgres recusando conexões (subindo, desligando ou sem vagas).
  '57P01',
  '57P03',
  '53300',
])

function codeOf(error: unknown): string | undefined {
  if (typeof error !== 'object' || error === null || !('code' in error)) return undefined
  return typeof error.code === 'string' ? error.code : undefined
}

// Percorre o erro, sua causa (o Drizzle embrulha o erro do driver) e os erros agregados.
function* chain(error: unknown, depth = 0): Generator<unknown> {
  if (depth > 5 || typeof error !== 'object' || error === null) return
  yield error
  if ('cause' in error) yield* chain(error.cause, depth + 1)
  if (error instanceof AggregateError) {
    for (const inner of error.errors) yield* chain(inner, depth + 1)
  }
}

export function isConnectionError(error: unknown): boolean {
  for (const item of chain(error)) {
    const code = codeOf(item)
    if (code && CONNECTION_CODES.has(code)) return true
  }
  return false
}

// Resumo seguro para log: o DrizzleQueryError traz os parâmetros da consulta (hashes, e-mails)
// na mensagem, então só o nome e o código de cada erro da cadeia vão para o log.
export function describeError(error: unknown): { name: string; code?: string }[] {
  const items: { name: string; code?: string }[] = []
  for (const item of chain(error)) {
    const name = item instanceof Error ? item.name : 'UnknownError'
    const code = codeOf(item)
    items.push(code ? { name, code } : { name })
  }
  return items.length > 0 ? items : [{ name: typeof error }]
}

// Violação de índice único do Postgres (23505), mesmo embrulhada pelo Drizzle.
export function isUniqueViolation(error: unknown): boolean {
  for (const item of chain(error)) if (codeOf(item) === '23505') return true
  return false
}
