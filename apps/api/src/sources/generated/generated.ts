import {
  GENERATION_DAILY_CALLS,
  type GeneratedSettings,
  type GeneratedSourceId,
} from '@cruzadinha/shared'
import { systemClock, type Clock } from '../../platform/lib/clock'
import { todayInSaoPaulo } from '../../platform/lib/dates'
import type { EditionListing, FetchPuzzleResult, PuzzleSource } from '../types'
import { requestWords, type Provider } from './client'
import { layout, seedFrom, toPuzzle } from './layout'
import { plain } from './normalize'
import { buildPrompt } from './prompt'
import { cleanWords } from './schema'

// Feature 064: fonte cuja cruzada a coleta gera com um modelo de linguagem. Serve a qualquer fonte
// gerada; só muda o provedor (research R11). Nunca gera fora da coleta: sem busca por data.

export type GeneratedSourceOptions = {
  id: GeneratedSourceId
  provider: Provider
  /** Interruptor `GENERATION_ENABLED` (desligado fora de produção; a API passa sempre `false`). */
  enabled: boolean
  fetch?: typeof globalThis.fetch
  clock?: Clock
  /** Configuração do painel, lida uma vez por geração (FR-020). */
  readSettings: () => Promise<GeneratedSettings>
  /** Reserva uma chamada do dia antes de sair (limite de 3 por fonte e dia, entre execuções). */
  reserveCall: (date: string) => Promise<boolean>
  /** Respostas da mesma fonte nos últimos 30 dias, para o modelo evitar e a validação descartar. */
  recentAnswers: (today: string) => Promise<string[]>
}

const skip = (detail: string): FetchPuzzleResult => ({ ok: false, reason: 'unavailable', detail })

export function createGeneratedSource(options: GeneratedSourceOptions): PuzzleSource {
  const fetch = options.fetch ?? globalThis.fetch
  const clock = options.clock ?? systemClock

  async function generate(today: string): Promise<FetchPuzzleResult> {
    if (!options.enabled) return skip('geração desligada')
    const { apiKey } = options.provider
    if (!apiKey) return skip('sem chave')

    const { gridSize: size, difficulty } = await options.readSettings()
    const avoid = [...new Set((await options.recentAnswers(today)).map(plain))]
    const avoidSet = new Set(avoid)
    let failure: FetchPuzzleResult = {
      ok: false,
      reason: 'unexpected-format',
      detail: 'nenhuma tentativa',
    }

    for (let attempt = 1; attempt <= GENERATION_DAILY_CALLS; attempt++) {
      if (!(await options.reserveCall(today))) {
        // Limite já esgotado ao começar: pulo quieto; esgotado nesta execução: a falha da última.
        return attempt === 1 ? skip('limite do dia') : failure
      }
      const result = await requestWords({
        provider: { ...options.provider, apiKey },
        messages: buildPrompt({ size, difficulty, date: today, avoid }),
        fetch,
      })
      if (!result.ok) {
        if (result.kind === 'no-credits') return skip('sem créditos')
        if (result.kind === 'refused') {
          return { ok: false, reason: 'refused', detail: result.detail }
        }
        failure = {
          ok: false,
          reason: result.kind === 'down' ? 'source-down' : 'unexpected-format',
          detail: result.detail,
        }
        continue
      }
      const words = cleanWords(result.items, { size, avoid: avoidSet })
      const placed = layout(words, size, seedFrom(`${today}:${attempt}`))
      const built =
        placed && toPuzzle(placed, { source: options.id, date: today, size, difficulty })
      if (built) return { ok: true, ...built, dates: [] }
      failure = { ok: false, reason: 'unexpected-format', detail: 'palavras insuficientes' }
    }
    return failure
  }

  return {
    id: options.id,
    onDemand: false,
    // Só o dia corrente; dias passados nunca são gerados (FR-004).
    async *listRecent(): AsyncIterable<EditionListing> {
      const today = todayInSaoPaulo(clock)
      yield { ok: true, date: today, author: null, loadPuzzle: () => generate(today) }
    },
    async fetchPuzzle() {
      return { ok: false, reason: 'unavailable' }
    },
  }
}
