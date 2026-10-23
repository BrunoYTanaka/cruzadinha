// Texto de uma dica da Cruzadas Brasil (research R4, R5). O JSON traz a dica como texto, mas pode
// vir com entidades HTML ou marcação.
const NAMED: Record<string, string> = {
  amp: '&',
  lt: '<',
  gt: '>',
  quot: '"',
  apos: "'",
  nbsp: ' ',
}

const ENTITY = /&(#x[0-9a-f]+|#[0-9]+|[a-z][a-z0-9]*);/gi

/** Devolve o texto limpo, ou `null` se sobrar vazio ou houver entidade desconhecida. */
export function clueText(raw: string): string | null {
  let unknownEntity = false
  const text = raw
    .replace(/<br\s*\/?>/gi, ' ')
    .replace(/<[^>]*>/g, '')
    .replace(ENTITY, (match, body: string) => {
      if (body.startsWith('#')) {
        const hex = body[1] === 'x' || body[1] === 'X'
        const code = Number.parseInt(body.slice(hex ? 2 : 1), hex ? 16 : 10)
        if (Number.isInteger(code) && code > 0 && code <= 0x10ffff) {
          return String.fromCodePoint(code)
        }
        unknownEntity = true
        return match
      }
      const named = NAMED[body.toLowerCase()]
      if (named === undefined) unknownEntity = true
      return named ?? match
    })
    .replace(/\s+/g, ' ')
    .trim()
  if (unknownEntity || text.length === 0) return null
  return text
}
