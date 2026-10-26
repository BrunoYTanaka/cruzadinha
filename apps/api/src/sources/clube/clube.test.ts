import { describe, expect, it, vi } from 'vitest'
import { createClubeSource } from './clube'
import { readFixture } from './fixtures'
import type { EditionListing } from '../types'

const CATEGORY = '/jogo/categoria/id/1/n/cruzadas-classicas'
const E901 = '/jogo/i/id/4898/cruzadas-classicas-901/'
const E900 = '/jogo/i/id/4890/cruzadas-classicas-900/'

type Route = Response | (() => Response)
const text = (body: string, status = 200) => new Response(body, { status })

// `fetch` injetado: a rota é o caminho; qualquer outro pedido é 404. `calls` guarda cada pedido.
function fakeFetch(routes: Record<string, Route>) {
  const calls: { url: string; userAgent: string | null }[] = []
  const fn = vi.fn(async (input: string | URL | Request, init?: RequestInit) => {
    const url = String(input)
    calls.push({ url, userAgent: new Headers(init?.headers).get('user-agent') })
    const route = routes[new URL(url).pathname]
    if (route === undefined) return text('', 404)
    return typeof route === 'function' ? route() : route.clone()
  })
  return { fetch: fn as unknown as typeof globalThis.fetch, calls }
}

const goodRoutes = (): Record<string, Route> => ({
  [CATEGORY]: text(readFixture('category.html')),
  [E901]: text(readFixture('page-valid.html')),
  [E900]: text(readFixture('page-first.html')),
  '/jogos/CC901.js': text(readFixture('game-valid.js')),
  '/jogos/CC1.js': text(readFixture('game-valid.js')),
})

async function collect(
  source: ReturnType<typeof createClubeSource>,
  oldestDate = '2020-01-01',
  beforeRequest?: () => Promise<void>,
) {
  const out: EditionListing[] = []
  for await (const item of source.listRecent!({ oldestDate, beforeRequest })) out.push(item)
  return out
}

describe('fonte clube', () => {
  it('não tem busca por data: devolve unavailable sem fazer pedido', async () => {
    const { fetch, calls } = fakeFetch(goodRoutes())
    const source = createClubeSource({ fetch })
    expect(source.id).toBe('clube')
    expect(source.onDemand).toBe(false)
    expect(await source.fetchPuzzle('daily', '2026-10-19')).toMatchObject({
      ok: false,
      reason: 'unavailable',
    })
    expect(calls).toHaveLength(0)
  })

  it('lança TypeError para nível ou data inválidos', async () => {
    const source = createClubeSource({ fetch: fakeFetch({}).fetch })
    await expect(source.fetchPuzzle('weekly' as 'daily', '2026-10-19')).rejects.toThrow(TypeError)
    await expect(source.fetchPuzzle('daily', '19/10/2026')).rejects.toThrow(TypeError)
  })

  describe('listRecent', () => {
    it('segue o link anterior, da mais nova para a mais antiga, e identifica o projeto', async () => {
      const { fetch, calls } = fakeFetch(goodRoutes())
      const items = await collect(createClubeSource({ fetch }))
      expect(items.map((item) => item.ok && item.date)).toEqual(['2026-10-19', '2020-01-01'])
      expect(items[0]).toMatchObject({ ok: true, author: 'Autora de Exemplo' })
      expect(calls.map((call) => new URL(call.url).pathname)).toEqual([CATEGORY, E901, E900])
      expect(calls.every((call) => call.userAgent?.startsWith('cruzadinha'))).toBe(true)
    })

    it('para ao passar da janela, sem pedir a página seguinte', async () => {
      const { fetch, calls } = fakeFetch(goodRoutes())
      const items = await collect(createClubeSource({ fetch }), '2026-10-01')
      expect(items).toHaveLength(1)
      expect(calls).toHaveLength(3)
    })

    it('parar de consumir não faz mais pedidos', async () => {
      const { fetch, calls } = fakeFetch(goodRoutes())
      const source = createClubeSource({ fetch })
      for await (const item of source.listRecent!({ oldestDate: '2020-01-01' })) {
        expect(item.ok).toBe(true)
        break
      }
      expect(calls).toHaveLength(2)
    })

    it('chama beforeRequest antes de cada pedido', async () => {
      const { fetch, calls } = fakeFetch(goodRoutes())
      const before = vi.fn(async () => {})
      const items = await collect(createClubeSource({ fetch }), '2020-01-01', before)
      const listing = calls.length
      expect(before).toHaveBeenCalledTimes(listing)
      if (!items[0]?.ok) throw new Error('esperava uma edição')
      await items[0].loadPuzzle()
      expect(before).toHaveBeenCalledTimes(listing + 1)
    })

    it('loadPuzzle pede o script, lê na sandbox e converte', async () => {
      const { fetch, calls } = fakeFetch(goodRoutes())
      const [first] = await collect(createClubeSource({ fetch }))
      if (!first?.ok) throw new Error('esperava uma edição')
      expect(calls.some((call) => call.url.endsWith('.js'))).toBe(false)
      const result = await first.loadPuzzle()
      if (!result.ok) throw new Error(result.detail)
      expect(result.puzzle).toMatchObject({ source: 'clube', date: '2026-10-19' })
      expect(result.puzzle.attribution).toMatchObject({
        sourceName: 'Cruzadas Clube',
        author: 'Autora de Exemplo',
      })
      expect(calls.filter((call) => call.url.endsWith('.js'))).toHaveLength(1)
    })

    it('uma edição já conhecida custa só a página: nada além dela é pedido', async () => {
      const { fetch, calls } = fakeFetch(goodRoutes())
      await collect(createClubeSource({ fetch }), '2026-10-01')
      expect(calls.filter((call) => call.url.endsWith('.js'))).toHaveLength(0)
    })

    it.each([
      [429, 'rate-limited'],
      [503, 'source-down'],
      [404, 'unavailable'],
      [403, 'unavailable'],
      [418, 'unexpected-format'],
    ] as const)('status %s da lista vira %s', async (status, reason) => {
      const routes = { ...goodRoutes(), [CATEGORY]: text('', status) }
      const items = await collect(createClubeSource({ fetch: fakeFetch(routes).fetch }))
      expect(items).toEqual([{ ok: false, reason, detail: `HTTP ${status}` }])
    })

    it('erro de rede vira source-down', async () => {
      const fetch = vi.fn(async () => {
        throw new TypeError('fetch failed')
      }) as unknown as typeof globalThis.fetch
      const items = await collect(createClubeSource({ fetch }))
      expect(items).toEqual([
        { ok: false, reason: 'source-down', detail: 'falha de rede ou tempo limite' },
      ])
    })

    it('lista sem edição e página sem data são formato inesperado', async () => {
      const empty = { ...goodRoutes(), [CATEGORY]: text('<html></html>') }
      expect(await collect(createClubeSource({ fetch: fakeFetch(empty).fetch }))).toEqual([
        { ok: false, reason: 'unexpected-format', detail: 'lista: nenhuma edição' },
      ])
      const noDate = { ...goodRoutes(), [E901]: text(readFixture('page-no-date.html')) }
      expect(await collect(createClubeSource({ fetch: fakeFetch(noDate).fetch }))).toEqual([
        { ok: false, reason: 'unexpected-format', detail: 'página: data não encontrada' },
      ])
    })

    it('corpo acima do limite é recusado', async () => {
      const big = { ...goodRoutes(), [CATEGORY]: text('x'.repeat(2_000)) }
      const items = await collect(
        createClubeSource({ fetch: fakeFetch(big).fetch, maxBytes: 1_000 }),
      )
      expect(items).toEqual([
        { ok: false, reason: 'unexpected-format', detail: 'corpo grande demais' },
      ])
    })

    describe('corpo em pedaços, sem content-length', () => {
      const chunked =
        (chunks: Uint8Array[], onCancel = () => {}) =>
        () => {
          let next = 0
          const body = new ReadableStream<Uint8Array>({
            pull(controller) {
              const chunk = chunks[next++]
              if (chunk) controller.enqueue(chunk)
              else controller.close()
            },
            cancel: onCancel,
          })
          return new Response(body, { status: 200 })
        }

      it('para de ler ao passar do limite e cancela o resto', async () => {
        const cancelled = vi.fn()
        const pieces = Array.from({ length: 50 }, () => new TextEncoder().encode('x'.repeat(100)))
        const routes = { ...goodRoutes(), [CATEGORY]: chunked(pieces, cancelled) }
        const items = await collect(
          createClubeSource({ fetch: fakeFetch(routes).fetch, maxBytes: 1_000 }),
        )

        expect(items).toEqual([
          { ok: false, reason: 'unexpected-format', detail: 'corpo grande demais' },
        ])
        expect(cancelled).toHaveBeenCalledTimes(1)
      })

      it('junta os pedaços, inclusive uma letra acentuada partida ao meio', async () => {
        const bytes = new TextEncoder().encode(readFixture('category.html'))
        const cut = bytes.indexOf(0xc3) + 1
        const split = cut > 0 ? [bytes.slice(0, cut), bytes.slice(cut)] : [bytes]
        const routes = { ...goodRoutes(), [CATEGORY]: chunked(split) }
        const chunkedItems = await collect(createClubeSource({ fetch: fakeFetch(routes).fetch }))
        const wholeItems = await collect(
          createClubeSource({ fetch: fakeFetch(goodRoutes()).fetch }),
        )

        // Os itens trazem funções (loadPuzzle); o JSON compara só os dados.
        expect(JSON.stringify(chunkedItems)).toBe(JSON.stringify(wholeItems))
      })
    })

    it('um ciclo de edições anteriores não gira para sempre', async () => {
      const loop = text(readFixture('page-valid.html').replace(E900, E901))
      const routes = { ...goodRoutes(), [E901]: loop }
      const items = await collect(createClubeSource({ fetch: fakeFetch(routes).fetch }))
      expect(items).toHaveLength(1)
    })
  })

  describe('loadPuzzle', () => {
    async function load(script: Route | undefined, extra: Record<string, Route> = {}) {
      const routes: Record<string, Route> = { ...goodRoutes(), ...extra }
      if (script !== undefined) routes['/jogos/CC901.js'] = script
      const [first] = await collect(createClubeSource({ fetch: fakeFetch(routes).fetch }))
      if (!first?.ok) throw new Error('esperava uma edição')
      return first.loadPuzzle()
    }

    it.each([
      [429, 'rate-limited'],
      [500, 'source-down'],
      [404, 'unavailable'],
    ] as const)('status %s do script vira %s', async (status, reason) => {
      expect(await load(text('', status))).toMatchObject({ ok: false, reason })
    })

    it('script que usa rede, arquivos ou nunca termina vira unexpected-format', async () => {
      for (const file of [
        'game-network.js',
        'game-require.js',
        'game-process.js',
        'game-no-variable.js',
      ]) {
        expect(await load(text(readFixture(file)))).toMatchObject({
          ok: false,
          reason: 'unexpected-format',
        })
      }
    })

    it('XML com DOCTYPE é recusado', async () => {
      const script = `var CrosswordPuzzleData = '<!DOCTYPE x [<!ENTITY a "b">]><x/>';`
      expect(await load(text(script))).toMatchObject({
        ok: false,
        reason: 'unexpected-format',
        detail: 'xml: DOCTYPE recusado',
      })
    })

    it('XML mal formado ou de outra estrutura é unexpected-format', async () => {
      expect(await load(text(`var CrosswordPuzzleData = '<a><b></a>';`))).toMatchObject({
        ok: false,
        reason: 'unexpected-format',
      })
      expect(await load(text(`var CrosswordPuzzleData = '<outro/>';`))).toMatchObject({
        ok: false,
        reason: 'unexpected-format',
      })
    })

    it('não registra o corpo nem o script no detalhe da falha', async () => {
      const result = await load(text(readFixture('game-network.js')))
      expect(JSON.stringify(result)).not.toMatch(/example\.invalid|leak/)
    })
  })
})
