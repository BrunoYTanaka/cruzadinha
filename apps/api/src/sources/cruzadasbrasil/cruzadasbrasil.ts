import { isoDateSchema, levelSchema } from '@cruzadinha/shared'
import { systemClock, type Clock } from '../../lib/clock'
import { todayInSaoPaulo } from '../../lib/dates'
import type { FetchFailureReason, FetchPuzzleResult, PuzzleSource } from '../types'
import { convertCruzadasBrasil } from './convert'
import { readPageData } from './page-data'

const BASE_URL = 'https://cruzadasbrasil.com.br/palavras-cruzadas'

export type CruzadasBrasilSourceOptions = {
  fetch?: typeof globalThis.fetch
  /** Decide o que é "futuro" pelo dia em Brasília. */
  clock?: Clock
  timeoutMs?: number
  /** Tamanho máximo do corpo; a página real tem cerca de 45 kB. */
  maxBytes?: number
}

const fail = (reason: FetchFailureReason, detail?: string): FetchPuzzleResult =>
  detail === undefined ? { ok: false, reason } : { ok: false, reason, detail }

export function createCruzadasBrasilSource(
  options: CruzadasBrasilSourceOptions = {},
): PuzzleSource {
  const fetch = options.fetch ?? globalThis.fetch
  const clock = options.clock ?? systemClock
  const timeoutMs = options.timeoutMs ?? 10_000
  const maxBytes = options.maxBytes ?? 1_048_576

  return {
    id: 'cruzadasbrasil',
    async fetchPuzzle(level, date) {
      if (!levelSchema.safeParse(level).success) throw new TypeError('nível inválido')
      if (!isoDateSchema.safeParse(date).success) {
        throw new TypeError('data inválida: use AAAA-MM-DD')
      }
      // A página de uma data futura responde "Em breve": nunca é pedida.
      if (date > todayInSaoPaulo(clock)) return fail('unavailable', 'data no futuro')

      let bytes: ArrayBuffer
      try {
        const response = await fetch(`${BASE_URL}/${date.replaceAll('-', '')}`, {
          headers: { accept: 'text/html' },
          signal: AbortSignal.timeout(timeoutMs),
        })
        if (response.status === 404) return fail('unavailable', 'HTTP 404')
        if (response.status === 429) return fail('rate-limited', 'HTTP 429')
        // 403 é o bloqueio da Cloudflare ao endereço do servidor (FR-019), não formato.
        if (response.status === 403 || response.status >= 500) {
          return fail('source-down', `HTTP ${response.status}`)
        }
        if (!response.ok) return fail('unexpected-format', `HTTP ${response.status}`)
        if (Number(response.headers.get('content-length') ?? 0) > maxBytes) {
          return fail('unexpected-format', 'corpo grande demais')
        }
        bytes = await response.arrayBuffer()
      } catch {
        return fail('source-down', 'falha de rede ou tempo limite')
      }

      if (bytes.byteLength > maxBytes) return fail('unexpected-format', 'corpo grande demais')

      // Sempre UTF-8, qualquer que seja o cabeçalho; byte inválido é falha explícita (R4).
      let html: string
      try {
        html = new TextDecoder('utf-8', { fatal: true }).decode(bytes)
      } catch {
        return fail('unexpected-format', 'corpo não é UTF-8 válido')
      }

      const read = readPageData(html)
      if (!read.ok) return fail('unexpected-format', read.detail)
      return convertCruzadasBrasil(read.data, level, date)
    },
  }
}
