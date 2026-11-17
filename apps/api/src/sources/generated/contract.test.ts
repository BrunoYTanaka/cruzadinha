import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import { requestWords } from './client'
import { layout, minWords, seedFrom, toPuzzle } from './layout'
import { cleanWords } from './schema'

// Constituição IV (research R8b): resposta real do DeepSeek salva uma vez com
// `source:check:generated --save` (sem `id`, `usage` e `system_fingerprint`). Se o formato do
// provedor mudar, este teste é o primeiro a quebrar.
const body = readFileSync(new URL('./fixtures/deepseek-response.json', import.meta.url), 'utf8')
const provider = { baseUrl: 'https://api.deepseek.com', model: 'deepseek-chat', apiKey: 'teste' }
const fetch = (async () =>
  new Response(body, { status: 200 })) as unknown as typeof globalThis.fetch

describe('contrato DeepSeek (resposta real)', () => {
  it.each([9, 11])('a resposta real vira uma cruzada %i x %i válida', async (size) => {
    const result = await requestWords({
      provider,
      messages: [{ role: 'user', content: 'pedido' }],
      fetch,
    })
    if (!result.ok) throw new Error(`resposta recusada: ${result.kind}`)
    const words = cleanWords(result.items, { size, avoid: new Set() })
    expect(words.length).toBeGreaterThanOrEqual(minWords(size))
    const placed = layout(words, size, seedFrom('2026-11-17'))
    expect(placed?.length).toBeGreaterThanOrEqual(minWords(size))
    const built = toPuzzle(placed!, {
      source: 'casa',
      date: '2026-11-17',
      size,
      difficulty: 'medium',
    })
    expect(built?.puzzle.grid).toMatchObject({ width: size, height: size })
  })
})
