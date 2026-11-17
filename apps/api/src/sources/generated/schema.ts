import { z } from 'zod'
import { isBlocked, isBlockedAnswer } from './blocklist'
import type { ValidWord } from './layout'
import { plain } from './normalize'

// Feature 064: a resposta do modelo é dado externo; entra como `unknown` e só sai daqui validada.

// `POST /chat/completions`: só o que é usado; o resto da resposta é ignorado (tolerante).
export const chatCompletionSchema = z.object({
  choices: z
    .array(
      z.object({
        message: z.object({ content: z.string().nullable() }),
        finish_reason: z.string().nullable(),
      }),
    )
    .min(1),
})

// O JSON que o pedido manda o modelo devolver (contracts/deepseek-request.md).
export const modelOutputSchema = z.object({
  words: z
    .array(z.object({ answer: z.unknown(), clue: z.unknown() }))
    .min(20)
    .max(100),
})

const ANSWER_LETTERS = /^[A-ZÁÀÂÃÉÊÍÓÔÕÚÜÇ]+$/u
const MIN_ANSWER = 3
const MIN_CLUE = 3
const MAX_CLUE = 120

/**
 * Item a item (research R8, R13, R14): o item inválido sai sozinho. Resposta só com letras (acento
 * e cedilha), de 3 letras até o lado da grade, fora de `avoid` e sem repetir; dica só texto, de 3 a
 * 120 caracteres, sem a resposta e sem termo bloqueado.
 */
export function cleanWords(
  items: readonly { answer: unknown; clue: unknown }[],
  options: { size: number; avoid: ReadonlySet<string> },
): ValidWord[] {
  const seen = new Set<string>()
  const words: ValidWord[] = []
  for (const item of items) {
    if (typeof item.answer !== 'string' || typeof item.clue !== 'string') continue
    const answer = item.answer.trim().toLocaleUpperCase('pt-BR')
    const clue = item.clue.trim().replace(/\s+/g, ' ')
    const length = [...answer].length
    const key = plain(answer)
    if (!ANSWER_LETTERS.test(answer) || length < MIN_ANSWER || length > options.size) continue
    if (seen.has(key) || options.avoid.has(key) || isBlockedAnswer(answer)) continue
    if (clue.length < MIN_CLUE || clue.length > MAX_CLUE) continue
    if (/[<>]|https?:|www\./i.test(clue)) continue
    if (plain(clue).includes(key) || isBlocked(clue)) continue
    seen.add(key)
    words.push({ answer, clue })
  }
  return words
}
