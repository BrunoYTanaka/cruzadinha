import type { Level } from '@cruzadinha/shared'
import { describe, expect, it, vi } from 'vitest'
import { createCruzadaOnlineSource } from './cruzadaonline'
import { readFixture } from './fixtures'

// 2026-10-17 ao meio-dia em Brasília.
const clock = () => new Date('2026-10-17T15:00:00Z')

function xml(body: string, status = 200, headers: Record<string, string> = {}) {
  return new Response(body, {
    status,
    headers: { 'content-type': 'text/xml', ...headers },
  })
}

function setup(response?: Response | Error, options: { maxBytes?: number } = {}) {
  const fetch = vi.fn<typeof globalThis.fetch>()
  if (response instanceof Error) fetch.mockRejectedValueOnce(response)
  else if (response) fetch.mockResolvedValueOnce(response)
  const source = createCruzadaOnlineSource({ fetch, clock, ...options })
  return { source, fetch }
}

describe('createCruzadaOnlineSource', () => {
  it('faz um único pedido ao arquivo do dia e devolve o puzzle', async () => {
    const { source, fetch } = setup(xml(readFixture('daily-valid.xml')))
    const result = await source.fetchPuzzle('daily', '2026-10-16')

    expect(source.id).toBe('cruzadaonline')
    expect(result).toMatchObject({ ok: true, dates: [] })
    expect(result.ok && result.puzzle.source).toBe('cruzadaonline')
    expect(fetch).toHaveBeenCalledOnce()
    const [url, init] = fetch.mock.calls[0]!
    expect(String(url)).toBe(
      'https://static.publico.pt/s3/files/widgets/crosswords/prd/20261016.xml',
    )
    expect(new Headers(init?.headers).get('accept')).toContain('xml')
    expect(init?.signal).toBeInstanceOf(AbortSignal)
  })

  it('aceita o dia de hoje em Brasília', async () => {
    const { source } = setup(xml(readFixture('daily-valid.xml')))
    expect((await source.fetchPuzzle('daily', '2026-10-17')).ok).toBe(true)
  })

  it.each([403, 404])('HTTP %i da CDN é "indisponível"', async (status) => {
    const { source } = setup(xml(readFixture('cdn-error.xml'), status))
    expect(await source.fetchPuzzle('daily', '2026-10-16')).toMatchObject({
      ok: false,
      reason: 'unavailable',
    })
  })

  it('corpo de erro da CDN com status 200 é formato inesperado', async () => {
    const { source } = setup(xml(readFixture('cdn-error.xml')))
    expect(await source.fetchPuzzle('daily', '2026-10-16')).toMatchObject({
      ok: false,
      reason: 'unexpected-format',
    })
  })

  it('429 é limite de uso, sem nova tentativa', async () => {
    const { source, fetch } = setup(xml('', 429))
    expect(await source.fetchPuzzle('daily', '2026-10-16')).toMatchObject({
      ok: false,
      reason: 'rate-limited',
    })
    expect(fetch).toHaveBeenCalledOnce()
  })

  it.each([500, 503])('HTTP %i é fonte fora do ar', async (status) => {
    const { source, fetch } = setup(xml('', status))
    expect(await source.fetchPuzzle('daily', '2026-10-16')).toMatchObject({
      ok: false,
      reason: 'source-down',
    })
    expect(fetch).toHaveBeenCalledOnce()
  })

  it('falha de rede e tempo limite são fonte fora do ar', async () => {
    const network = setup(new TypeError('fetch failed'))
    expect(await network.source.fetchPuzzle('daily', '2026-10-16')).toMatchObject({
      reason: 'source-down',
    })
    const timeout = setup(new DOMException('tempo esgotado', 'TimeoutError'))
    expect(await timeout.source.fetchPuzzle('daily', '2026-10-16')).toMatchObject({
      reason: 'source-down',
    })
  })

  it.each([302, 400])('outro status (%i) é formato inesperado', async (status) => {
    const { source } = setup(xml('', status))
    expect(await source.fetchPuzzle('daily', '2026-10-16')).toEqual({
      ok: false,
      reason: 'unexpected-format',
      detail: `HTTP ${status}`,
    })
  })

  it('recusa corpo grande demais, pelo cabeçalho e pelo tamanho real', async () => {
    const body = readFixture('daily-valid.xml')
    const byHeader = setup(xml(body, 200, { 'content-length': '5000000' }))
    expect(await byHeader.source.fetchPuzzle('daily', '2026-10-16')).toMatchObject({
      reason: 'unexpected-format',
    })
    const bySize = setup(xml(body), { maxBytes: 100 })
    expect(await bySize.source.fetchPuzzle('daily', '2026-10-16')).toMatchObject({
      reason: 'unexpected-format',
    })
  })

  it.each(['with-doctype.xml', 'malformed.xml', 'changed-shape.xml'])(
    '%s é formato inesperado',
    async (name) => {
      const { source } = setup(xml(readFixture(name)))
      expect(await source.fetchPuzzle('daily', '2026-10-16')).toMatchObject({
        ok: false,
        reason: 'unexpected-format',
      })
    },
  )

  it('corpo que não é XML é formato inesperado', async () => {
    const { source } = setup(xml('{"ok":true}'))
    expect(await source.fetchPuzzle('daily', '2026-10-16')).toMatchObject({
      reason: 'unexpected-format',
    })
  })

  it('data no futuro é indisponível, sem pedido, mesmo que o arquivo exista', async () => {
    const { source, fetch } = setup(xml(readFixture('daily-valid.xml')))
    expect(await source.fetchPuzzle('daily', '2026-10-18')).toEqual({
      ok: false,
      reason: 'unavailable',
      detail: 'data no futuro',
    })
    expect(fetch).not.toHaveBeenCalled()
  })

  it('nível ou data inválidos lançam TypeError sem pedido', async () => {
    const { source, fetch } = setup()
    await expect(source.fetchPuzzle('mini' as Level, '2026-10-16')).rejects.toThrow(TypeError)
    await expect(source.fetchPuzzle('daily', '16/10/2026')).rejects.toThrow(TypeError)
    expect(fetch).not.toHaveBeenCalled()
  })

  it('nenhum detalhe de falha carrega o conteúdo da resposta (FR-010)', async () => {
    const bodies = [
      xml(readFixture('cdn-error.xml')),
      xml(readFixture('word-without-clue.xml')),
      xml(readFixture('with-doctype.xml')),
      xml(readFixture('malformed.xml')),
    ]
    for (const body of bodies) {
      const { source } = setup(body)
      const result = await source.fetchPuzzle('daily', '2026-10-16')
      expect(result.ok).toBe(false)
      expect(JSON.stringify(result)).not.toMatch(/FICTICIO|Parente|Sem umidade|AccessDenied/)
    }
  })
})
