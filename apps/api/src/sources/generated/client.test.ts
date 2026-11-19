import { describe, expect, it } from 'vitest'
import { chatCompletion, sampleClues } from './fixtures'
import { requestClues } from './client'

const KEY = 'chave-de-teste-secreta'
const provider = { baseUrl: 'https://modelo.exemplo', model: 'modelo-x', apiKey: KEY }
const messages = [{ role: 'user' as const, content: 'pedido' }]

function respond(status: number, body: unknown) {
  const calls: { url: string; init: RequestInit }[] = []
  const fetch = (async (url: string, init: RequestInit) => {
    calls.push({ url, init })
    return new Response(typeof body === 'string' ? body : JSON.stringify(body), { status })
  }) as unknown as typeof globalThis.fetch
  return { fetch, calls }
}

describe('requestClues', () => {
  it('faz o pedido do contrato e devolve os itens', async () => {
    const { fetch, calls } = respond(200, chatCompletion(sampleClues()))
    const result = await requestClues({ provider, messages, fetch })
    expect(result.ok && result.items.length).toBe(2)
    expect(calls[0]!.url).toBe('https://modelo.exemplo/chat/completions')
    expect(calls[0]!.init.headers).toMatchObject({ authorization: `Bearer ${KEY}` })
    expect(JSON.parse(String(calls[0]!.init.body))).toEqual({
      model: 'modelo-x',
      messages,
      response_format: { type: 'json_object' },
      temperature: 1.0,
      max_tokens: 6000,
      stream: false,
    })
  })

  it.each([
    [402, 'no-credits'],
    [401, 'refused'],
    [400, 'bad-content'],
    [422, 'bad-content'],
    [429, 'down'],
    [500, 'down'],
    [503, 'down'],
  ])('classifica HTTP %i como %s', async (status, kind) => {
    const { fetch } = respond(status, { error: { message: `segredo ${KEY} no corpo` } })
    const result = await requestClues({ provider, messages, fetch })
    expect(result).toEqual({ ok: false, kind, detail: `HTTP ${status}` })
  })

  it.each([
    ['conteúdo vazio', chatCompletion('   ')],
    ['conteúdo cortado', chatCompletion(sampleClues(), 'length')],
    ['conteúdo que não é JSON', chatCompletion('não sou json')],
    ['lista ausente', chatCompletion(JSON.stringify({ words: [] }))],
    ['corpo fora do formato', { qualquer: 'coisa' }],
  ])('trata %s como conteúdo ruim', async (_, body) => {
    const { fetch } = respond(200, body)
    const result = await requestClues({ provider, messages, fetch })
    expect(result.ok === false && result.kind).toBe('bad-content')
  })

  it('trata falha de rede como serviço fora do ar', async () => {
    const fetch = (async () => {
      throw new TypeError('fetch failed')
    }) as unknown as typeof globalThis.fetch
    expect(await requestClues({ provider, messages, fetch })).toEqual({
      ok: false,
      kind: 'down',
      detail: 'falha de rede',
    })
  })

  it('nunca devolve a chave nem o conteúdo da resposta (FR-014, FR-015)', async () => {
    for (const [status, body] of [
      [402, `sem saldo para ${KEY}`],
      [200, chatCompletion(`texto bruto ${KEY}`)],
    ] as const) {
      const { fetch } = respond(status, body)
      const text = JSON.stringify(await requestClues({ provider, messages, fetch }))
      expect(text).not.toContain(KEY)
      expect(text).not.toContain('texto bruto')
    }
  })
})
