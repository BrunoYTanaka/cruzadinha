import { isoDateSchema, levelSchema, type Level } from '@cruzadinha/shared'
import type { FetchFailureReason, FetchPuzzleResult, PuzzleSource } from '../types'
import { agilmenteResponseSchema, errorBodySchema } from './agilmente-schema'
import { convertAgilmenteResponse } from './convert'
import { generateAnonymousToken } from './token'

const BASE_URL = 'https://oglobo-api.agilmenteapp.com/api/games/crossword'

export type OgloboSourceOptions = {
  fetch?: typeof globalThis.fetch
  generateToken?: () => string
  timeoutMs?: number
}

// Resultado de um único pedido: a recusa é separada para permitir uma nova tentativa.
type Attempt = { refused: true } | { refused: false; result: FetchPuzzleResult }

const fail = (reason: FetchFailureReason, detail?: string): Attempt => ({
  refused: false,
  result: detail === undefined ? { ok: false, reason } : { ok: false, reason, detail },
})

export function createOgloboSource(options: OgloboSourceOptions = {}): PuzzleSource {
  const fetch = options.fetch ?? globalThis.fetch
  const generateToken = options.generateToken ?? generateAnonymousToken
  const timeoutMs = options.timeoutMs ?? 10_000
  let token: string | undefined

  async function attempt(level: Level, date: string, accessToken: string): Promise<Attempt> {
    let response: Response
    let text: string
    try {
      response = await fetch(`${BASE_URL}/${level}/${date}`, {
        headers: { 'x-access-token': accessToken, accept: 'application/json' },
        signal: AbortSignal.timeout(timeoutMs),
      })
      if (response.status === 429) return fail('rate-limited', 'HTTP 429')
      if (response.status >= 500) return fail('source-down', `HTTP ${response.status}`)
      text = await response.text()
    } catch {
      return fail('source-down', 'falha de rede ou tempo limite')
    }

    let body: unknown
    let isJson = true
    try {
      body = JSON.parse(text)
    } catch {
      isJson = false
    }

    // O campo error vem antes de tudo: com NOT-AVAILABLE a fonte manda junto um ipuzData que não
    // é o da data pedida.
    const errorBody = errorBodySchema.safeParse(body)
    if (errorBody.success) {
      if (errorBody.data.error === 'NO-USER') return { refused: true }
      if (errorBody.data.error === 'NOT-AVAILABLE') return fail('unavailable')
      return fail('unexpected-format', 'campo error com valor desconhecido')
    }
    if (response.status === 401 || response.status === 403) return { refused: true }
    if (response.status === 404) return fail('unavailable', 'HTTP 404')
    if (!response.ok) return fail('unexpected-format', `HTTP ${response.status}`)
    if (!isJson) return fail('unexpected-format', 'corpo não é JSON')

    const parsed = agilmenteResponseSchema.safeParse(body)
    if (!parsed.success) {
      const issue = parsed.error.issues[0]
      const detail = issue ? `${issue.path.map(String).join('.')}: ${issue.message}` : undefined
      return fail('unexpected-format', detail)
    }

    const requested = parsed.data.dates?.find(
      (entry) =>
        typeof entry === 'object' && entry !== null && 'date' in entry && entry.date === date,
    )
    if (
      typeof requested === 'object' &&
      requested !== null &&
      'inTheFuture' in requested &&
      requested.inTheFuture === true
    ) {
      return fail('unavailable', 'data no futuro')
    }

    return { refused: false, result: convertAgilmenteResponse(parsed.data, level, date) }
  }

  return {
    id: 'oglobo',
    async fetchPuzzle(level, date) {
      if (!levelSchema.safeParse(level).success) throw new TypeError('nível inválido')
      if (!isoDateSchema.safeParse(date).success) {
        throw new TypeError('data inválida: use AAAA-MM-DD')
      }

      token ??= generateToken()
      const first = await attempt(level, date, token)
      if (!first.refused) return first.result

      token = generateToken()
      const second = await attempt(level, date, token)
      return second.refused ? { ok: false, reason: 'refused' } : second.result
    },
  }
}
