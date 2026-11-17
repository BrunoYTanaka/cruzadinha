import { plain, plainWords } from './normalize'

// Feature 064 (FR-021): termos que não podem aparecer em resposta nem dica. Lista curta e mantida
// por commit; o pedido ao modelo já evita temas sensíveis, esta lista é o mínimo garantido por
// código. Sem acento e em minúsculas; a comparação é por palavra inteira, sem acento.
const BLOCKED_TERMS = [
  'bosta',
  'buceta',
  'cacete',
  'caralho',
  'cuzao',
  'foda',
  'foder',
  'fodido',
  'merda',
  'piroca',
  'porra',
  'puta',
  'puto',
  'viado',
  'xoxota',
  'arrombado',
  'babaca',
  'bicha',
  'corno',
  'otario',
  'retardado',
  'vagabunda',
  'crioulo',
  'nazista',
  'estupro',
  'estuprador',
  'suicidio',
  'pedofilo',
  'porno',
  'pornografia',
  'sexo',
  'cocaina',
  'maconha',
] as const

const blocked = BLOCKED_TERMS.map((term) => plainWords(term))

/** Verdadeiro se o texto contém um termo bloqueado como palavra (ou sequência de palavras) inteira. */
export function isBlocked(text: string): boolean {
  const words = plainWords(text)
  return blocked.some((term) =>
    words.some((_, start) => term.every((part, i) => words[start + i] === part)),
  )
}

/** Verdadeiro se a resposta, sem acento, é um termo bloqueado de uma palavra. */
export function isBlockedAnswer(answer: string): boolean {
  const word = plain(answer)
  return blocked.some((term) => term.length === 1 && term[0] === word)
}
