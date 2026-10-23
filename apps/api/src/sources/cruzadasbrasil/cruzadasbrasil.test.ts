import { describe, expect, it, vi } from 'vitest'
import { createCruzadasBrasilSource } from './cruzadasbrasil'
import { readFixture } from './fixtures'

// 2026-10-17 ao meio-dia em Brasília.
const clock = () => new Date('2026-10-17T15:00:00Z')

function html(body: string | Uint8Array, status = 200, headers: Record<string, string> = {}) {
  return new Response(body as ConstructorParameters<typeof Response>[0], {
    status,
    headers: { 'content-type': 'text/html; charset=utf-8', ...headers },
  })
}

function setup(response?: Response | Error, options: { maxBytes?: number } = {}) {
  const fetch = vi.fn<typeof globalThis.fetch>()
  if (response instanceof Error) fetch.mockRejectedValueOnce(response)
  else if (response) fetch.mockResolvedValueOnce(response)
  const source = createCruzadasBrasilSource({ fetch, clock, ...options })
  return { source, fetch }
}

describe('createCruzadasBrasilSource', () => {
  it('faz um único pedido à página do dia e devolve o puzzle', async () => {
    const { source, fetch } = setup(html(readFixture('daily-valid.html')))
    const result = await source.fetchPuzzle('daily', '2026-10-16')

    expect(source.id).toBe('cruzadasbrasil')
    expect(result).toMatchObject({ ok: true, dates: [] })
    expect(result.ok && result.puzzle.source).toBe('cruzadasbrasil')
    expect(fetch).toHaveBeenCalledOnce()
    const [url, init] = fetch.mock.calls[0]!
    expect(String(url)).toBe('https://cruzadasbrasil.com.br/palavras-cruzadas/20261016')
    expect(new Headers(init?.headers).get('accept')).toContain('text/html')
    expect(init?.signal).toBeInstanceOf(AbortSignal)
  })

  it('aceita o dia de hoje em Brasília', async () => {
    const { source } = setup(
      html(readFixture('daily-valid.html').replaceAll('20261016', '20261017')),
    )
    expect((await source.fetchPuzzle('daily', '2026-10-17')).ok).toBe(true)
  })

  it('lê acentos e cedilha de bytes UTF-8, qualquer que seja o cabeçalho', async () => {
    const bytes = new TextEncoder().encode(readFixture('daily-valid.html'))
    const { source } = setup(html(bytes, 200, { 'content-type': 'text/html; charset=latin1' }))
    const result = await source.fetchPuzzle('daily', '2026-10-16')
    expect(result.ok && result.solution.cells[0]).toEqual(['A', 'Ç', 'Ã', 'O', null])
    expect(result.ok && result.puzzle.words[3]!.clue).toBe('Órgão da visão')
  })

  it('404 é "indisponível"', async () => {
    const { source } = setup(html(readFixture('coming-soon.html'), 404))
    expect(await source.fetchPuzzle('daily', '2026-10-16')).toMatchObject({
      ok: false,
      reason: 'unavailable',
    })
  })

  it('429 é "rate-limited" e não há nova tentativa', async () => {
    const { source, fetch } = setup(html('', 429))
    expect(await source.fetchPuzzle('daily', '2026-10-16')).toMatchObject({
      reason: 'rate-limited',
    })
    expect(fetch).toHaveBeenCalledOnce()
  })

  it.each([403, 500, 503])('HTTP %i é "source-down"', async (status) => {
    const { source } = setup(html('', status))
    expect(await source.fetchPuzzle('daily', '2026-10-16')).toMatchObject({
      reason: 'source-down',
    })
  })

  it('outro 4xx é formato inesperado', async () => {
    const { source } = setup(html('', 410))
    expect(await source.fetchPuzzle('daily', '2026-10-16')).toMatchObject({
      reason: 'unexpected-format',
    })
  })

  it('erro de rede e tempo limite são "source-down"', async () => {
    for (const error of [new TypeError('fetch failed'), new DOMException('t', 'TimeoutError')]) {
      const { source } = setup(error)
      expect(await source.fetchPuzzle('daily', '2026-10-16')).toMatchObject({
        reason: 'source-down',
      })
    }
  })

  it('data futura é "indisponível" sem nenhum pedido', async () => {
    const { source, fetch } = setup()
    expect(await source.fetchPuzzle('daily', '2026-10-18')).toMatchObject({
      ok: false,
      reason: 'unavailable',
    })
    expect(fetch).not.toHaveBeenCalled()
  })

  it('lança TypeError para nível ou data inválidos', async () => {
    const { source } = setup()
    await expect(source.fetchPuzzle('weekly' as 'daily', '2026-10-16')).rejects.toThrow(TypeError)
    await expect(source.fetchPuzzle('daily', '16/10/2026')).rejects.toThrow(TypeError)
  })

  it.each([
    ['no-game-data.html', 'dados do jogo ausentes'],
    ['coming-soon.html', 'dados do jogo ausentes'],
    ['invalid-json.html', 'dados do jogo não são JSON válido'],
  ])('%s é formato inesperado', async (name, detail) => {
    const { source } = setup(html(readFixture(name)))
    expect(await source.fetchPuzzle('daily', '2026-10-16')).toEqual({
      ok: false,
      reason: 'unexpected-format',
      detail,
    })
  })

  it('página de outra data e nível não suportado', async () => {
    expect(
      await setup(html(readFixture('other-date.html'))).source.fetchPuzzle('daily', '2026-10-16'),
    ).toMatchObject({ reason: 'unexpected-format' })
    expect(
      await setup(html(readFixture('other-level.html'))).source.fetchPuzzle('daily', '2026-10-16'),
    ).toMatchObject({ reason: 'unsupported' })
  })

  it('recusa corpo grande demais (cabeçalho ou tamanho lido) e UTF-8 inválido', async () => {
    const big = html(readFixture('daily-valid.html'), 200, { 'content-length': '2000000' })
    expect(await setup(big).source.fetchPuzzle('daily', '2026-10-16')).toMatchObject({
      reason: 'unexpected-format',
      detail: 'corpo grande demais',
    })
    const read = setup(html(readFixture('daily-valid.html')), { maxBytes: 100 })
    expect(await read.source.fetchPuzzle('daily', '2026-10-16')).toMatchObject({
      detail: 'corpo grande demais',
    })
    const invalid = setup(html(new Uint8Array([0xff, 0xfe, 0x41])))
    expect(await invalid.source.fetchPuzzle('daily', '2026-10-16')).toMatchObject({
      reason: 'unexpected-format',
    })
  })

  it('o detalhe nunca leva trecho do corpo', async () => {
    const { source } = setup(html('<html>Palavras secretas do corpo</html>'))
    const result = await source.fetchPuzzle('daily', '2026-10-16')
    expect(JSON.stringify(result)).not.toContain('secretas')
  })
})
