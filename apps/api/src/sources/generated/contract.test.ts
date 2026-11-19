import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import { requestClues } from './client'
import { chatCompletionSchema, cleanClues } from './schema'

// Constituição IV (research R8b, R12): resposta real do DeepSeek ao pedido de dicas, salva com
// `source:check:generated --save` e reduzida (sem `id`, `usage` e `system_fingerprint`). As
// respostas pedidas estão em `deepseek-request-answers.json`. Se o formato do provedor mudar,
// este teste é o primeiro a quebrar.
const read = (name: string) => readFileSync(new URL(`./fixtures/${name}`, import.meta.url), 'utf8')
const body = read('deepseek-response.json')
const answers = JSON.parse(read('deepseek-request-answers.json')) as {
  n: number
  form: string
  plain: string
}[]
const provider = { baseUrl: 'https://api.deepseek.com', model: 'deepseek-chat', apiKey: 'teste' }
const fetch = (async () =>
  new Response(body, { status: 200 })) as unknown as typeof globalThis.fetch

describe('contrato DeepSeek (resposta real de dicas)', () => {
  it('o envelope real passa por chatCompletionSchema', () => {
    const parsed = chatCompletionSchema.parse(JSON.parse(body))
    expect(parsed.choices[0]?.finish_reason).toBe('stop')
  })

  it('requestClues lê uma dica por resposta pedida', async () => {
    const result = await requestClues({
      provider,
      messages: [{ role: 'user', content: 'pedido' }],
      fetch,
    })
    if (!result.ok) throw new Error(`resposta recusada: ${result.kind}`)
    expect(result.items).toHaveLength(answers.length)
  })

  it('cleanClues aceita as dicas reais válidas e recusa a que traz a resposta', async () => {
    const result = await requestClues({
      provider,
      messages: [{ role: 'user', content: 'pedido' }],
      fetch,
    })
    if (!result.ok) throw new Error('resposta recusada')
    // Na resposta real, a dica de "tragam" repete a palavra: a tentativa inteira cai (FR-010).
    const first = cleanClues(result.items, answers)
    expect(first).toMatchObject({ ok: false, detail: 'dica inválida' })
    expect(!first.ok && first.retry).toEqual([answers.find((a) => a.form === 'tragam')!.n])
    const rest = answers.filter((a) => a.form !== 'tragam')
    const cleaned = cleanClues(
      result.items.filter((i) => i.n !== answers.find((a) => a.form === 'tragam')!.n),
      rest,
    )
    expect(cleaned.ok && cleaned.clues).toHaveLength(rest.length)
  })
})
