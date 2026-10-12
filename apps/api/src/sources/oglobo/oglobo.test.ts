import type { Level } from '@cruzadinha/shared'
import { describe, expect, it, vi } from 'vitest'
import dailyValid from './fixtures/daily-valid.json'
import refused from './fixtures/refused.json'
import unavailable from './fixtures/unavailable.json'
import { createOgloboSource } from './oglobo'

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json' },
  })
}

function setup(...responses: (Response | Error)[]) {
  const fetch = vi.fn<typeof globalThis.fetch>()
  for (const response of responses) {
    if (response instanceof Error) fetch.mockRejectedValueOnce(response)
    else fetch.mockResolvedValueOnce(response)
  }
  let count = 0
  const generateToken = vi.fn(() => `token-de-teste-${++count}`)
  const source = createOgloboSource({ fetch, generateToken })
  return { source, fetch, generateToken }
}

function tokenOf(fetch: ReturnType<typeof setup>['fetch'], call: number) {
  const headers = new Headers(fetch.mock.calls[call]?.[1]?.headers)
  return headers.get('x-access-token')
}

describe('createOgloboSource', () => {
  it('faz o pedido esperado e devolve o puzzle', async () => {
    const { source, fetch } = setup(json(dailyValid))
    const result = await source.fetchPuzzle('daily', '2026-10-12')

    expect(result.ok).toBe(true)
    expect(source.id).toBe('oglobo')
    expect(fetch).toHaveBeenCalledOnce()
    const [url, init] = fetch.mock.calls[0]!
    expect(String(url)).toBe(
      'https://oglobo-api.agilmenteapp.com/api/games/crossword/daily/2026-10-12',
    )
    expect(tokenOf(fetch, 0)).toBe('token-de-teste-1')
    expect(init?.signal).toBeInstanceOf(AbortSignal)
  })

  it('reutiliza o token entre chamadas', async () => {
    const { source, fetch, generateToken } = setup(json(dailyValid), json(dailyValid))
    await source.fetchPuzzle('daily', '2026-10-12')
    await source.fetchPuzzle('daily', '2026-10-12')
    expect(generateToken).toHaveBeenCalledOnce()
    expect(tokenOf(fetch, 1)).toBe('token-de-teste-1')
  })

  it.each([
    ['corpo NO-USER com status 200', json(refused)],
    ['HTTP 401', json({}, 401)],
    ['HTTP 403', json({}, 403)],
  ])('troca o token uma vez e devolve refused: %s', async (_, response) => {
    const { source, fetch } = setup(response, json(refused))
    expect(await source.fetchPuzzle('daily', '2026-10-12')).toMatchObject({
      ok: false,
      reason: 'refused',
    })
    expect(fetch).toHaveBeenCalledTimes(2)
    expect(tokenOf(fetch, 0)).toBe('token-de-teste-1')
    expect(tokenOf(fetch, 1)).toBe('token-de-teste-2')
  })

  it('devolve o puzzle quando a nova tentativa funciona', async () => {
    const { source } = setup(json(refused), json(dailyValid))
    expect(await source.fetchPuzzle('daily', '2026-10-12')).toMatchObject({ ok: true })
  })

  it.each([
    ['HTTP 429', json({}, 429), 'rate-limited'],
    ['HTTP 500', json({}, 500), 'source-down'],
    ['falha de rede', new TypeError('fetch failed'), 'source-down'],
    ['tempo limite', new DOMException('timeout', 'TimeoutError'), 'source-down'],
    ['HTTP 404', json({}, 404), 'unavailable'],
    ['corpo NOT-AVAILABLE só com dates', json(unavailable), 'unavailable'],
    [
      'corpo NOT-AVAILABLE com a resposta completa',
      json({ ...dailyValid, error: 'NOT-AVAILABLE' }),
      'unavailable',
    ],
    ['corpo não-JSON', new Response('<html>', { status: 200 }), 'unexpected-format'],
    ['outro valor em error', json({ error: 'OUTRO' }), 'unexpected-format'],
    ['HTTP 400', json({}, 400), 'unexpected-format'],
    ['corpo fora do schema', json({ id: 'x' }), 'unexpected-format'],
  ])('%s → %s, sem nova tentativa', async (_, response, reason) => {
    const { source, fetch } = setup(response)
    const result = await source.fetchPuzzle('daily', '2026-10-12')
    expect(result).toMatchObject({ ok: false, reason })
    expect(fetch).toHaveBeenCalledOnce()
  })

  it('devolve unavailable para data marcada como futura', async () => {
    const { source } = setup(json(dailyValid))
    expect(await source.fetchPuzzle('daily', '2026-10-13')).toMatchObject({
      ok: false,
      reason: 'unavailable',
    })
  })

  it('lança TypeError para nível ou data inválidos, sem pedir à fonte', async () => {
    const { source, fetch } = setup()
    await expect(source.fetchPuzzle('weekly' as Level, '2026-10-12')).rejects.toThrow(TypeError)
    await expect(source.fetchPuzzle('mini' as Level, '2026-10-12')).rejects.toThrow(TypeError)
    await expect(source.fetchPuzzle('daily', '2026-13-01')).rejects.toThrow(TypeError)
    expect(fetch).not.toHaveBeenCalled()
  })

  it('não expõe o token nem o conteúdo da resposta no resultado (FR-013)', async () => {
    const broken = structuredClone(dailyValid)
    broken.ipuzData.clues.Across.push([9, 'Dica secreta sobrando'])
    const responses = [json(dailyValid), json(broken), json(refused), json(refused)]
    const { source } = setup(...responses)
    const results = [
      await source.fetchPuzzle('daily', '2026-10-12'),
      await source.fetchPuzzle('daily', '2026-10-12'),
      await source.fetchPuzzle('daily', '2026-10-12'),
    ]
    for (const result of results) {
      expect(JSON.stringify(result)).not.toContain('token-de-teste')
    }
    expect(JSON.stringify(results[1])).not.toContain('Dica secreta')
  })
})
