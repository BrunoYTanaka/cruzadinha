import { isoDateSchema, levelSchema } from '@cruzadinha/shared'
import { systemClock, type Clock } from '../../lib/clock'
import { todayInSaoPaulo } from '../../lib/dates'
import type { FetchFailureReason, FetchPuzzleResult, PuzzleSource } from '../types'
import { convertCrosswordCompiler } from './convert'
import { readXml } from '../common/xml'

const BASE_URL = 'https://static.publico.pt/s3/files/widgets/crosswords/prd'

export type CruzadaOnlineSourceOptions = {
  fetch?: typeof globalThis.fetch
  /** Decide o que é "futuro" pelo dia em Brasília. */
  clock?: Clock
  timeoutMs?: number
  /** Tamanho máximo do corpo; o arquivo real tem cerca de 10 kB. */
  maxBytes?: number
}

const fail = (reason: FetchFailureReason, detail?: string): FetchPuzzleResult =>
  detail === undefined ? { ok: false, reason } : { ok: false, reason, detail }

// Sem DOCTYPE não há entidade definida no documento: nem expansão em cadeia nem entidade externa
// (research R2). A fonte não usa DOCTYPE.
const DOCTYPE = /<!DOCTYPE/i

export function createCruzadaOnlineSource(options: CruzadaOnlineSourceOptions = {}): PuzzleSource {
  const fetch = options.fetch ?? globalThis.fetch
  const clock = options.clock ?? systemClock
  const timeoutMs = options.timeoutMs ?? 10_000
  const maxBytes = options.maxBytes ?? 1_048_576

  return {
    id: 'cruzadaonline',
    async fetchPuzzle(level, date) {
      if (!levelSchema.safeParse(level).success) throw new TypeError('nível inválido')
      if (!isoDateSchema.safeParse(date).success) {
        throw new TypeError('data inválida: use AAAA-MM-DD')
      }
      // A fonte publica o dia seguinte na véspera: o futuro nunca é pedido.
      if (date > todayInSaoPaulo(clock)) return fail('unavailable', 'data no futuro')

      let response: Response
      let text: string
      try {
        response = await fetch(`${BASE_URL}/${date.replaceAll('-', '')}.xml`, {
          headers: { accept: 'application/xml, text/xml' },
          signal: AbortSignal.timeout(timeoutMs),
        })
        if (response.status === 429) return fail('rate-limited', 'HTTP 429')
        if (response.status >= 500) return fail('source-down', `HTTP ${response.status}`)
        // A CDN responde 403 (AccessDenied) para um arquivo que não existe.
        if (response.status === 403 || response.status === 404) {
          return fail('unavailable', `HTTP ${response.status}`)
        }
        if (!response.ok) return fail('unexpected-format', `HTTP ${response.status}`)
        if (Number(response.headers.get('content-length') ?? 0) > maxBytes) {
          return fail('unexpected-format', 'corpo grande demais')
        }
        text = await response.text()
      } catch {
        return fail('source-down', 'falha de rede ou tempo limite')
      }

      if (Buffer.byteLength(text) > maxBytes) {
        return fail('unexpected-format', 'corpo grande demais')
      }
      if (DOCTYPE.test(text)) return fail('unexpected-format', 'xml: DOCTYPE recusado')

      const read = readXml(text)
      if (!read.ok) return fail('unexpected-format', read.detail)
      return convertCrosswordCompiler(read.doc, level, date)
    },
  }
}
