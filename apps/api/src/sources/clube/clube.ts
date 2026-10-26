import { isoDateSchema, levelSchema } from '@cruzadinha/shared'
import { readXml } from '../common/xml'
import type { EditionListing, FetchFailureReason, FetchPuzzleResult, PuzzleSource } from '../types'
import { convertClube } from './convert'
import { isEditionPath, parseEditionPage, parseLatestEdition } from './page'
import { readPuzzleData, type SandboxLimits } from './sandbox'

const BASE_URL = 'https://cruzadasclube.com.br'
const CATEGORY_PATH = '/jogo/categoria/id/1/n/cruzadas-classicas'
// Identifica o projeto à fonte; o uso é privado e atribuído (constituição, princípio VIII).
const USER_AGENT = 'cruzadinha (projeto pessoal; uso privado)'
// Defesa contra um ciclo de "anterior" ou uma lista sem fim.
const MAX_EDITIONS = 400

export type ClubeSourceOptions = {
  fetch?: typeof globalThis.fetch
  timeoutMs?: number
  /** Tamanho máximo de cada corpo; a página tem cerca de 25 kB e o script, 40 kB. */
  maxBytes?: number
  sandbox?: SandboxLimits
}

const fail = (reason: FetchFailureReason, detail?: string): FetchPuzzleResult =>
  detail === undefined ? { ok: false, reason } : { ok: false, reason, detail }

// Sem DOCTYPE não há entidade definida no documento (como na Cruzada Online, research R2).
const DOCTYPE = /<!DOCTYPE/i

type Got = { ok: true; text: string } | { ok: false; reason: FetchFailureReason; detail: string }

// Lê o corpo aos pedaços e para ao passar de `maxBytes`, mesmo sem `content-length`; devolve
// undefined nesse caso. O que passou do limite nunca é decodificado.
async function readText(response: Response, maxBytes: number): Promise<string | undefined> {
  if (!response.body) return ''
  const reader = response.body.getReader()
  const chunks: Uint8Array[] = []
  let total = 0
  for (;;) {
    const { done, value } = await reader.read()
    if (done) break
    total += value.byteLength
    if (total > maxBytes) {
      // Sem esperar: o cancelamento de um corpo duplicado (`clone`) só termina com as duas pontas.
      void reader.cancel().catch(() => {})
      return undefined
    }
    chunks.push(value)
  }
  return new TextDecoder().decode(Buffer.concat(chunks))
}

export function createClubeSource(options: ClubeSourceOptions = {}): PuzzleSource {
  const fetch = options.fetch ?? globalThis.fetch
  const timeoutMs = options.timeoutMs ?? 10_000
  const maxBytes = options.maxBytes ?? 1_048_576

  async function get(path: string): Promise<Got> {
    try {
      const response = await fetch(`${BASE_URL}${path}`, {
        headers: { 'user-agent': USER_AGENT, accept: 'text/html,application/javascript,*/*' },
        signal: AbortSignal.timeout(timeoutMs),
      })
      if (response.status === 429) return { ok: false, reason: 'rate-limited', detail: 'HTTP 429' }
      if (response.status >= 500) {
        return { ok: false, reason: 'source-down', detail: `HTTP ${response.status}` }
      }
      if (response.status === 403 || response.status === 404) {
        return { ok: false, reason: 'unavailable', detail: `HTTP ${response.status}` }
      }
      if (!response.ok) {
        return { ok: false, reason: 'unexpected-format', detail: `HTTP ${response.status}` }
      }
      if (Number(response.headers.get('content-length') ?? 0) > maxBytes) {
        return { ok: false, reason: 'unexpected-format', detail: 'corpo grande demais' }
      }
      const text = await readText(response, maxBytes)
      if (text === undefined) {
        return { ok: false, reason: 'unexpected-format', detail: 'corpo grande demais' }
      }
      return { ok: true, text }
    } catch {
      return { ok: false, reason: 'source-down', detail: 'falha de rede ou tempo limite' }
    }
  }

  // Segundo pedido da edição: o arquivo do jogo, lido na sandbox (nunca fora dela).
  async function loadEdition(
    scriptPath: string,
    date: string,
    author: string | null,
  ): Promise<FetchPuzzleResult> {
    const script = await get(scriptPath)
    if (!script.ok) return fail(script.reason, script.detail)
    const data = await readPuzzleData(script.text, options.sandbox)
    if (!data.ok) return fail('unexpected-format', data.detail)
    if (DOCTYPE.test(data.value)) return fail('unexpected-format', 'xml: DOCTYPE recusado')
    const read = readXml(data.value)
    if (!read.ok) return fail('unexpected-format', read.detail)
    return convertClube(read.doc, 'daily', date, author)
  }

  return {
    id: 'clube',
    onDemand: false,

    // A fonte não tem busca por data: as edições chegam pela coleta (`listRecent`).
    async fetchPuzzle(level, date) {
      if (!levelSchema.safeParse(level).success) throw new TypeError('nível inválido')
      if (!isoDateSchema.safeParse(date).success) {
        throw new TypeError('data inválida: use AAAA-MM-DD')
      }
      return fail('unavailable', 'a fonte não tem busca por data')
    },

    async *listRecent({ oldestDate, beforeRequest }): AsyncGenerator<EditionListing> {
      await beforeRequest?.()
      const list = await get(CATEGORY_PATH)
      if (!list.ok) {
        yield { ok: false, reason: list.reason, detail: list.detail }
        return
      }
      let path = parseLatestEdition(list.text)
      if (path === null) {
        yield { ok: false, reason: 'unexpected-format', detail: 'lista: nenhuma edição' }
        return
      }

      const visited = new Set<string>()
      while (path !== null && visited.size < MAX_EDITIONS) {
        visited.add(path)
        await beforeRequest?.()
        const page = await get(path)
        if (!page.ok) {
          yield { ok: false, reason: page.reason, detail: page.detail }
          return
        }
        const parsed = parseEditionPage(page.text)
        if (!parsed.ok) {
          yield { ok: false, reason: 'unexpected-format', detail: parsed.detail }
          return
        }
        const { date, author, scriptPath, previousPath } = parsed.page
        // As edições vêm da mais nova para a mais antiga: passou da janela, acabou.
        if (date < oldestDate) return
        yield {
          ok: true,
          date,
          author,
          async loadPuzzle() {
            await beforeRequest?.()
            return loadEdition(scriptPath, date, author)
          },
        }
        path =
          previousPath !== null && isEditionPath(previousPath) && !visited.has(previousPath)
            ? previousPath
            : null
      }
    },
  }
}
