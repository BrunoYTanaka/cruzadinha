// Texto de uma dica ou de um metadado do Crossword Compiler (research R3). O conteúdo chega cru,
// com a marcação, porque o leitor trata `clue` como nó de parada para não embaralhar a ordem.
const NAMED: Record<string, string> = { amp: '&', lt: '<', gt: '>', quot: '"', apos: "'" }

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
      const named = NAMED[body]
      if (named === undefined) unknownEntity = true
      return named ?? match
    })
    .replace(/\s+/g, ' ')
    .trim()
  if (unknownEntity || text.length === 0) return null
  return text
}
