import {
  GENERATION_DAILY_CALLS,
  type Difficulty,
  type GeneratedSettings,
  type GeneratedSourceId,
} from '@cruzadinha/shared'
import { systemClock, type Clock } from '../../platform/lib/clock'
import { todayInSaoPaulo } from '../../platform/lib/dates'
import type { EditionListing, FetchPuzzleResult, PuzzleSource } from '../types'
import { isBlockedAnswer } from './blocklist'
import { requestClues, type Provider } from './client'
import { buildIndex, generateGrid, refillRegion, type FilledGrid } from './fill'
import { seededRandom, seedFrom, toPuzzle } from './layout'
import { plain } from './normalize'
import { buildCluePrompt } from './prompt'
import { cleanClues } from './schema'
import { loadWordList, type Band, type WordEntry } from './words/word-list'

// Features 064 e 065: fonte cuja cruzada a coleta gera. O código preenche uma grade densa com a
// lista de palavras e o modelo de linguagem só escreve as dicas (research R9). Serve a qualquer
// fonte gerada; só muda o provedor. Nunca gera fora da coleta: sem busca por data.

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
  /** Respostas da mesma fonte nos últimos 30 dias; só as de 5 letras ou mais ficam de fora da grade. */
  recentAnswers: (today: string) => Promise<string[]>
  /** Uma linha de diagnóstico por tentativa (passos e contagens, nunca palavras nem dicas). */
  log?: (line: string) => void
  /** Lista de palavras; os testes passam uma inventada. */
  loadWords?: () => Promise<WordEntry[]>
}

const skip = (detail: string): FetchPuzzleResult => ({ ok: false, reason: 'unavailable', detail })

const MAX_BAND: Record<Difficulty, Band> = { easy: 1, medium: 2, hard: 3 }
const MIN_RECENT_LENGTH = 5
const MAX_SLOT = 7

const answersOf = (grid: FilledGrid) =>
  grid.words.map((word, i) => ({ n: i + 1, form: word.form, plain: word.plain }))

export function createGeneratedSource(options: GeneratedSourceOptions): PuzzleSource {
  const fetch = options.fetch ?? globalThis.fetch
  const clock = options.clock ?? systemClock

  // Um pedido de dicas. `stop` encerra a coleta (sem créditos, chave recusada); `failure` falha só
  // a tentativa.
  async function askClues(
    apiKey: string,
    answers: readonly { n: number; form: string }[],
    difficulty: Difficulty,
    repair = false,
  ): Promise<{
    items?: { n: unknown; clue: unknown }[]
    stop?: FetchPuzzleResult
    failure?: FetchPuzzleResult
  }> {
    const result = await requestClues({
      provider: { ...options.provider, apiKey },
      messages: buildCluePrompt({ answers, difficulty, repair }),
      fetch,
    })
    if (result.ok) return { items: result.items }
    if (result.kind === 'no-credits') return { stop: skip('sem créditos') }
    if (result.kind === 'refused')
      return { stop: { ok: false, reason: 'refused', detail: result.detail } }
    return {
      failure: {
        ok: false,
        reason: result.kind === 'down' ? 'source-down' : 'unexpected-format',
        detail: result.detail,
      },
    }
  }

  async function generate(today: string): Promise<FetchPuzzleResult> {
    if (!options.enabled) return skip('geração desligada')
    const { apiKey } = options.provider
    if (!apiKey) return skip('sem chave')

    const { gridSize: size, difficulty } = await options.readSettings()
    const recent = new Set(
      (await options.recentAnswers(today)).map(plain).filter((a) => a.length >= MIN_RECENT_LENGTH),
    )
    const words = (await (options.loadWords ?? loadWordList)()).filter(
      (w) => !recent.has(w.plain) && !isBlockedAnswer(w.plain),
    )
    let failure: FetchPuzzleResult = {
      ok: false,
      reason: 'unexpected-format',
      detail: 'nenhuma tentativa',
    }
    let reserved = 0

    for (let attempt = 1; attempt <= GENERATION_DAILY_CALLS; attempt++) {
      // Diagnóstico sem palavras nem dicas: só os passos da tentativa (vai para o log da coleta).
      const steps: string[] = []
      try {
        // Preencher não gasta chamada: só uma grade fechada reserva uma (FR-009).
        let grid = generateGrid({
          size,
          words,
          maxBand: MAX_BAND[difficulty],
          random: seededRandom(seedFrom(`${today}:${attempt}`)),
          clock: () => clock(),
          maxSlot: MAX_SLOT,
        })
        if (!grid) {
          steps.push('grade não preenchida')
          failure = { ok: false, reason: 'unexpected-format', detail: 'grade não preenchida' }
          continue
        }
        if (!(await options.reserveCall(today))) {
          steps.push('sem chamada do dia')
          // Nenhuma chamada reservada nesta execução: pulo quieto; senão, a falha da última.
          return reserved === 0 ? skip('limite do dia') : failure
        }
        reserved++
        const previous = grid.words
        let answers = answersOf(grid)
        const asked = await askClues(apiKey, answers, difficulty)
        if (asked.stop) {
          steps.push(asked.stop.ok ? '' : (asked.stop.detail ?? asked.stop.reason))
          return asked.stop
        }
        let cleaned = asked.items ? cleanClues(asked.items, answers) : null
        steps.push(
          !cleaned
            ? ((asked.failure as { detail?: string }).detail ?? 'falha')
            : cleaned.ok
              ? `${answers.length} dicas ok`
              : `${cleaned.detail} (${cleaned.retry.length} de ${answers.length})`,
        )
        if (!cleaned) {
          failure = asked.failure!
          continue
        }
        if (!cleaned.ok && cleaned.retry.length > 0) {
          // Reparo (clarificação 2026-11-19), gastando mais uma chamada do dia: troca a palavra sem
          // dica boa e as vizinhas, travando o resto da grade, e pede dica só das palavras novas. Se
          // a região não fechar, pede de novo a dica das mesmas palavras.
          const { retry: retryNs, valid, detail } = cleaned
          if (!(await options.reserveCall(today))) {
            steps.push('sem chamada para o reparo')
            return { ok: false, reason: 'unexpected-format', detail }
          }
          const maxBand = Math.max(...grid.words.map((w) => w.band)) as Band
          const swapped = refillRegion(
            grid,
            retryNs.map((n) => n - 1),
            buildIndex(
              words.filter((w) => w.band <= maxBand),
              MAX_SLOT,
            ),
            { random: seededRandom(seedFrom(`${today}:${attempt}:reparo`)) },
          )
          if (swapped) grid = { ...grid, words: swapped }
          answers = answersOf(grid)
          const askNs = swapped
            ? answers.filter((a, i) => swapped[i]!.plain !== previous[i]!.plain).map((a) => a.n)
            : retryNs
          const retry = answers.filter((a) => askNs.includes(a.n))
          steps.push(
            swapped
              ? `troca local (${retry.length} palavras)`
              : `pedido repetido (${retry.length})`,
          )
          const again = await askClues(apiKey, retry, difficulty, !swapped)
          if (again.stop) {
            steps.push(again.stop.ok ? '' : (again.stop.detail ?? again.stop.reason))
            return again.stop
          }
          const fixed = again.items ? cleanClues(again.items, retry) : null
          steps.push(
            fixed
              ? fixed.ok
                ? 'dicas ok'
                : fixed.detail
              : ((again.failure as { detail?: string }).detail ?? 'falha'),
          )
          if (!fixed?.ok) {
            failure = fixed
              ? { ok: false, reason: 'unexpected-format', detail: fixed.detail }
              : again.failure!
            continue
          }
          const repaired = new Map(retry.map((a, i) => [a.n, fixed.clues[i]!]))
          cleaned = { ok: true, clues: answers.map((a) => repaired.get(a.n) ?? valid.get(a.n)!) }
        }
        if (!cleaned.ok) {
          failure = { ok: false, reason: 'unexpected-format', detail: cleaned.detail }
          continue
        }
        const built = toPuzzle(grid, cleaned.clues, { source: options.id, date: today, difficulty })
        if (built) {
          steps.push('gravada')
          return { ok: true, ...built, dates: [] }
        }
        steps.push('grade inválida')
        failure = { ok: false, reason: 'unexpected-format', detail: 'grade inválida' }
      } finally {
        if (steps.length > 0) options.log?.(`tentativa ${attempt}: ${steps.join(' → ')}`)
      }
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
