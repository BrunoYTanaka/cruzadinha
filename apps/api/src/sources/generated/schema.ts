import { z } from 'zod'
import { isBlocked } from './blocklist'
import { plain } from './normalize'

// Features 064 e 065: a resposta do modelo é dado externo; entra como `unknown` e só sai daqui validada.

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

// O JSON que o pedido manda o modelo devolver (contracts/clue-request.md). Itens validados em
// `cleanClues`.
export const clueOutputSchema = z.object({
  clues: z.array(z.object({ n: z.unknown(), clue: z.unknown() })).max(200),
})

const MIN_CLUE = 3
const MAX_CLUE = 120

export type CleanClues =
  | { ok: true; clues: string[] }
  | {
      ok: false
      detail: string
      /** Dicas já válidas, por número, para o reparo não pedir de novo. */
      valid: Map<number, string>
      /** Números sem dica válida (faltando ou inválida): é o que o reparo pede de novo. */
      retry: number[]
    }

/**
 * Uma dica por resposta pedida (contracts/clue-request.md): devolve as dicas na ordem das
 * respostas ou a falha, com as dicas boas e os números a repetir. O detalhe nunca leva o texto da
 * dica nem da resposta.
 */
export function cleanClues(
  items: readonly { n: unknown; clue: unknown }[],
  answers: readonly { n: number; plain: string }[],
): CleanClues {
  const valid = new Map<number, string>()
  const seen = new Set<number>()
  let structural = false
  let invalid = false
  for (const item of items) {
    const answer = answers.find((a) => a.n === item.n)
    if (typeof item.n !== 'number' || !answer || seen.has(item.n)) {
      structural = true
      continue
    }
    seen.add(item.n)
    if (typeof item.clue !== 'string') continue
    const clue = item.clue.trim().replace(/\s+/g, ' ')
    if (
      clue.length < MIN_CLUE ||
      clue.length > MAX_CLUE ||
      /[<>]|https?:|www\./i.test(clue) ||
      plain(clue).includes(answer.plain) ||
      isBlocked(clue)
    ) {
      invalid = true
      continue
    }
    valid.set(item.n, clue)
  }
  const retry = answers.filter((a) => !valid.has(a.n)).map((a) => a.n)
  if (retry.length === 0 && !structural) {
    return { ok: true, clues: answers.map((a) => valid.get(a.n)!) }
  }
  return { ok: false, detail: invalid ? 'dica inválida' : 'dicas incompletas', valid, retry }
}
