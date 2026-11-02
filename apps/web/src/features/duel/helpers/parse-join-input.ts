import { duelCodeSchema, linkTokenSchema, type LookupDuelRequest } from '@cruzadinha/shared'

// Aceita o código de 8 caracteres (em qualquer caixa, com espaços ou traços) ou o link colado, com ou
// sem endereço do site e com ou sem o fragmento (o fragmento do link de retorno nunca é lido aqui).
export function parseJoinInput(raw: string): LookupDuelRequest | null {
  const text = raw.trim()
  if (text === '') return null
  const link = /\/x1\/([A-Za-z0-9_-]{20,200})(?=$|[#?/\s])/.exec(text)
  if (link?.[1] && linkTokenSchema.safeParse(link[1]).success) return { linkToken: link[1] }
  const code = text.replace(/[\s-]+/g, '').toUpperCase()
  return duelCodeSchema.safeParse(code).success ? { code } : null
}
