import {
  validatePuzzleWithSolution,
  type Level,
  type Puzzle,
  type PuzzleSourceId,
  type Solution,
} from '@cruzadinha/shared'
import { setTimeout as delay } from 'node:timers/promises'
import type { Database } from '../../platform/db/client'
import type { Clock } from '../../platform/lib/clock'
import { addDaysToIsoDate, candidateDates, todayInSaoPaulo } from '../../platform/lib/dates'
import type {
  FetchFailureReason,
  FetchPuzzleResult,
  FetchPuzzleSuccess,
  PuzzleSource,
} from '../../sources/types'
import type { RateLimits, RateLimiter } from '../../platform/rate-limit'
import {
  existingDates,
  findPuzzle,
  findPuzzleById,
  insertPuzzleIfAbsent,
  type StoredPuzzle,
} from './puzzles.repository'

export type GetPuzzleResult =
  | { ok: true; puzzleId: string; puzzle: Puzzle; solution: Solution }
  | { ok: false; reason: 'unavailable' }
  // `sourceReason` serve só para o log: nunca vai no corpo da resposta.
  | {
      ok: false
      reason: 'source-failed'
      source: PuzzleSourceId
      sourceReason: FetchFailureReason | 'inconsistent'
    }
  | { ok: false; reason: 'too-many-attempts'; retryAfterSeconds: number }

export type CollectReport = {
  /** Datas gravadas nesta execução. */
  saved: string[]
  /** Datas que já estavam no banco: nenhuma consulta à fonte. */
  skipped: string[]
  /** Datas que a fonte não publica; não são falha. */
  unavailable: string[]
  failed: { date: string; reason: FetchFailureReason }[]
  /** Execução interrompida pelo sinal de limite de uso da fonte. */
  stoppedBy?: 'rate-limited'
  /** Datas não obtidas por causa da interrupção; a próxima execução as tenta de novo. */
  pending: string[]
}

/** Uma execução da coleta: o relatório de cada fonte, na ordem em que foram coletadas. */
export type CollectRun = {
  sources: { source: PuzzleSourceId; report: CollectReport }[]
}

export const PAUSE_MS = 2_000

export type PuzzlesService = {
  collect(): Promise<CollectRun>
  getByDate(
    source: PuzzleSourceId,
    level: Level,
    date: string,
    address: string,
  ): Promise<GetPuzzleResult>
  getById(puzzleId: string): Promise<GetPuzzleResult>
}

/** Erro inesperado de um adaptador durante a coleta; quem chama decide como registrá-lo. */
export type CollectErrorHandler = (info: {
  source: PuzzleSourceId
  date: string
  error: unknown
}) => void

// Dias para trás que ainda se buscam na fonte; é o tamanho da biblioteca (366 por fonte).
const FETCH_WINDOW_DAYS = 366

export type PuzzlesDeps = {
  db: Database
  clock: Clock
  /** Um adaptador por fonte; a coleta segue esta ordem. */
  sources: readonly PuzzleSource[]
  rateLimiter: RateLimiter
  limits: RateLimits
  /** Dias anteriores a hoje que a coleta também busca (0 = só hoje). */
  historyDays?: number
  /** Recebe o erro inesperado de um adaptador na coleta, antes de a falha entrar no relatório. */
  onError?: CollectErrorHandler
  /** Pausa entre pedidos da coleta; injetável para os testes. */
  sleep?: (ms: number) => Promise<void>
}

// Defesa em profundidade (FR-006): o adaptador já valida o par, mas só grava o que passa aqui.
export function isConsistent(result: FetchPuzzleSuccess): boolean {
  return validatePuzzleWithSolution(result.puzzle, result.solution).success
}

// A solução vai ao navegador (feature 007): só sai se o par for coerente. A mensagem não
// carrega o conteúdo, e o manipulador de erros da app responde 500 genérico.
function deliver(stored: StoredPuzzle): GetPuzzleResult {
  if (!validatePuzzleWithSolution(stored.puzzle, stored.solution).success) {
    throw new Error('puzzle guardado inconsistente')
  }
  return { ok: true, ...stored }
}

export function createPuzzlesService(deps: PuzzlesDeps): PuzzlesService {
  const { db, clock, sources, rateLimiter, limits, historyDays = 0, sleep = delay, onError } = deps
  const bySource = new Map<PuzzleSourceId, PuzzleSource>()
  for (const source of sources) {
    if (bySource.has(source.id)) throw new Error(`fonte repetida: ${source.id}`)
    bySource.set(source.id, source)
  }

  function adapterFor(id: PuzzleSourceId): PuzzleSource {
    const source = bySource.get(id)
    if (!source) throw new Error(`fonte sem adaptador: ${id}`)
    return source
  }

  // A pausa vale entre quaisquer dois pedidos seguidos, inclusive de fontes diferentes.
  let requested = false
  async function pauseBeforeRequest() {
    if (requested) await sleep(PAUSE_MS)
    requested = true
  }

  // Fonte que lista as edições (feature 030): em vez de pedir cada data, percorre as edições da mais
  // nova à mais antiga até o início da janela e só pede o puzzle das datas que ainda não estão
  // salvas. Uma edição já salva custa só o pedido da página.
  async function collectListed(source: PuzzleSource): Promise<CollectReport> {
    const level: Level = 'daily'
    const today = todayInSaoPaulo(clock)
    const window = candidateDates(today, historyDays)
    const report: CollectReport = {
      saved: [],
      skipped: [],
      unavailable: [],
      failed: [],
      pending: [],
    }
    // A edição em andamento, para a falha apontar a data certa.
    let current = today
    try {
      for await (const listing of source.listRecent!({
        oldestDate: window[window.length - 1]!,
        beforeRequest: pauseBeforeRequest,
      })) {
        if (!listing.ok) {
          if (listing.reason === 'rate-limited') report.stoppedBy = 'rate-limited'
          else report.failed.push({ date: today, reason: listing.reason })
          break
        }
        const { date } = listing
        current = date
        // Edição com data futura não é jogável hoje: fica para uma coleta futura.
        if (date > today) {
          report.unavailable.push(date)
          continue
        }
        if ((await existingDates(db, { source: source.id, level, dates: [date] })).has(date)) {
          report.skipped.push(date)
          continue
        }
        const fetched = await listing.loadPuzzle()
        if (!fetched.ok) {
          if (fetched.reason === 'unavailable') report.unavailable.push(date)
          else if (fetched.reason === 'rate-limited') {
            report.stoppedBy = 'rate-limited'
            report.pending = [date]
            break
          } else report.failed.push({ date, reason: fetched.reason })
          continue
        }
        if (!isConsistent(fetched)) {
          report.failed.push({ date, reason: 'unexpected-format' })
          continue
        }
        const saved = await insertPuzzleIfAbsent(db, {
          puzzle: fetched.puzzle,
          solution: fetched.solution,
        })
        ;(saved.inserted ? report.saved : report.skipped).push(date)
      }
    } catch (error) {
      // Um erro inesperado do adaptador não pode impedir a coleta das outras fontes.
      onError?.({ source: source.id, date: current, error })
      report.failed.push({ date: current, reason: 'source-down' })
    }
    return report
  }

  async function collectSource(source: PuzzleSource): Promise<CollectReport> {
    if (source.listRecent) return collectListed(source)
    const level: Level = 'daily'
    const candidates = candidateDates(todayInSaoPaulo(clock), historyDays)
    const stored = await existingDates(db, { source: source.id, level, dates: candidates })
    const report: CollectReport = {
      saved: [],
      skipped: candidates.filter((date) => stored.has(date)),
      unavailable: [],
      failed: [],
      pending: [],
    }
    const missing = candidates.filter((date) => !stored.has(date))

    for (const [index, date] of missing.entries()) {
      // Uma requisição por data, com pausa entre elas para não pesar na fonte.
      await pauseBeforeRequest()
      let fetched: FetchPuzzleResult
      try {
        fetched = await source.fetchPuzzle(level, date)
      } catch (error) {
        // Um erro inesperado de um adaptador não pode impedir a coleta das outras fontes.
        onError?.({ source: source.id, date, error })
        report.failed.push({ date, reason: 'source-down' })
        break
      }
      if (!fetched.ok) {
        if (fetched.reason === 'unavailable') {
          report.unavailable.push(date)
        } else if (fetched.reason === 'rate-limited') {
          report.stoppedBy = 'rate-limited'
          report.pending = missing.slice(index)
          break
        } else {
          report.failed.push({ date, reason: fetched.reason })
        }
        continue
      }
      if (!isConsistent(fetched)) {
        report.failed.push({ date, reason: 'unexpected-format' })
        continue
      }
      const saved = await insertPuzzleIfAbsent(db, {
        puzzle: fetched.puzzle,
        solution: fetched.solution,
      })
      // Outra execução pode ter gravado a data entre a consulta e agora.
      ;(saved.inserted ? report.saved : report.skipped).push(date)
    }
    return report
  }

  return {
    async collect() {
      const run: CollectRun = { sources: [] }
      requested = false
      for (const source of sources) {
        run.sources.push({ source: source.id, report: await collectSource(source) })
      }
      return run
    },

    async getByDate(sourceId, level, date, address) {
      const source = adapterFor(sourceId)
      const stored = await findPuzzle(db, { source: sourceId, level, date })
      if (stored) return deliver(stored)

      // Fonte sem busca por data: o dia só existe se a coleta o salvou. Não pede à fonte nem
      // consome o limite de pedidos.
      if (source.onDemand === false) return { ok: false, reason: 'unavailable' }

      const today = todayInSaoPaulo(clock)
      if (date > today) return { ok: false, reason: 'unavailable' }
      // Mesma janela da biblioteca: um dia mais antigo não é buscado, senão qualquer visitante faria
      // o servidor pedir à fonte datas que ela não tem, e a resposta "indisponível" não é guardada.
      if (date < addDaysToIsoDate(today, -FETCH_WINDOW_DAYS)) {
        return { ok: false, reason: 'unavailable' }
      }

      // Só a ida à fonte conta no limite: puzzle guardado nunca chega aqui.
      const now = clock()
      const key = { action: 'PUZZLE_FETCH', keyType: 'NETWORK_ADDRESS', keyValue: address } as const
      // Contar e gravar de uma vez: pedidos simultâneos do mesmo endereço não passam do limite.
      const reservation = await rateLimiter.reserve([{ key, window: limits.puzzleFetch }], now)
      if (!reservation.allowed) {
        return {
          ok: false,
          reason: 'too-many-attempts',
          retryAfterSeconds: reservation.retryAfterSeconds,
        }
      }

      const fetched = await source.fetchPuzzle(level, date)
      if (!fetched.ok) {
        return fetched.reason === 'unavailable'
          ? { ok: false, reason: 'unavailable' }
          : { ok: false, reason: 'source-failed', source: sourceId, sourceReason: fetched.reason }
      }
      if (!isConsistent(fetched)) {
        return {
          ok: false,
          reason: 'source-failed',
          source: sourceId,
          sourceReason: 'inconsistent',
        }
      }

      const saved = await insertPuzzleIfAbsent(db, {
        puzzle: fetched.puzzle,
        solution: fetched.solution,
      })
      return {
        ok: true,
        puzzleId: saved.puzzleId,
        puzzle: fetched.puzzle,
        solution: fetched.solution,
      }
    },

    async getById(puzzleId) {
      const stored = await findPuzzleById(db, puzzleId)
      return stored ? deliver(stored) : { ok: false, reason: 'unavailable' }
    },
  }
}
