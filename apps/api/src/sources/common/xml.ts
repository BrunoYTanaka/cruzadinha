import { XMLParser, XMLValidator } from 'fast-xml-parser'

export type ReadXmlResult = { ok: true; doc: unknown } | { ok: false; detail: string }

// Elementos que podem se repetir: sempre listas, mesmo com uma só ocorrência. Só elementos: o
// atributo `word` da dica tem o mesmo nome do elemento `word` e precisa continuar texto.
const LISTS = new Set(['cell', 'word', 'clues', 'clue'])

// Atributos e textos chegam como texto e o Zod converte os números, para "010" ou "1e3" não virarem
// número em silêncio. O conteúdo de `clue` chega cru: sem isso, uma dica com marcação perde a ordem
// do texto (research R1 e R3). Os metadados também chegam crus, pelo mesmo motivo.
const parser = new XMLParser({
  ignoreAttributes: false,
  attributeNamePrefix: '',
  parseAttributeValue: false,
  parseTagValue: false,
  isArray: (name, _path, _isLeaf, isAttribute) => !isAttribute && LISTS.has(name),
  stopNodes: ['*.clue', '*.title', '*.creator', '*.copyright'],
})

/**
 * Lê o XML como dado desconhecido. Quem chama já recusou DOCTYPE e corpos grandes (research R2);
 * o detalhe da falha traz só o código do erro, nunca um trecho do corpo.
 */
export function readXml(text: string): ReadXmlResult {
  const valid = XMLValidator.validate(text)
  if (valid !== true) return { ok: false, detail: `xml: ${valid.err.code}` }
  try {
    return { ok: true, doc: parser.parse(text) as unknown }
  } catch {
    return { ok: false, detail: 'xml: falha na leitura' }
  }
}
