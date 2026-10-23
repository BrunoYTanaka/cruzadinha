import { afterAll, beforeEach, describe, expect, it } from 'vitest'
import { puzzles } from '../db/schema'
import { addDaysToIsoDate, todayInSaoPaulo } from '../lib/dates'
import { defaultRateLimits } from '../modules/rate-limit/limits'
import { createRateLimitRepository } from '../modules/rate-limit/rate-limit.repository'
import { createRateLimiter } from '../modules/rate-limit/rate-limit.service'
import { createPuzzlesService } from '../modules/puzzles/puzzles.service'
import type { CollectRun } from '../modules/puzzles/puzzles.service'
import type { FetchPuzzleResult } from '../sources/types'
import { fakeSource, okResult } from './fake-source'
import { openTestDatabase, testClock, truncateAll, type TestClock } from './database'

const handle = openTestDatabase()
const { db } = handle

let clock: TestClock

beforeEach(async () => {
  await truncateAll(db)
  clock = testClock()
})
afterAll(() => handle.close())

const today = () => todayInSaoPaulo(clock.now)

// Relatório da única fonte do serviço.
function only(run: CollectRun) {
  expect(run.sources).toHaveLength(1)
  return run.sources[0]!.report
}

function serviceWith(
  responses: Map<string, FetchPuzzleResult>,
  options: { historyDays?: number; sleep?: (ms: number) => Promise<void> } = {},
) {
  const source = fakeSource(responses)
  const service = createPuzzlesService({
    db,
    clock: clock.now,
    sources: [source],
    rateLimiter: createRateLimiter(createRateLimitRepository(db)),
    limits: defaultRateLimits,
    historyDays: options.historyDays ?? 0,
    sleep: options.sleep ?? (async () => {}),
  })
  return { service, source }
}

describe('collect (só o dia de hoje)', () => {
  it('grava o puzzle de hoje', async () => {
    const { service, source } = serviceWith(new Map([[today(), okResult(today())]]))
    const report = only(await service.collect())

    expect(report).toEqual({
      saved: [today()],
      skipped: [],
      unavailable: [],
      failed: [],
      pending: [],
    })
    expect(source.calls).toEqual([today()])
    expect(await db.select().from(puzzles)).toHaveLength(1)
  })

  it('é idempotente: a segunda execução não consulta a fonte', async () => {
    const { service, source } = serviceWith(new Map([[today(), okResult(today())]]))
    await service.collect()
    source.calls.length = 0

    const report = only(await service.collect())
    expect(report.saved).toEqual([])
    expect(report.skipped).toEqual([today()])
    expect(source.calls).toEqual([])
    expect(await db.select().from(puzzles)).toHaveLength(1)
  })

  it('registra a falha da fonte sem apagar o que já existe', async () => {
    const yesterday = addDaysToIsoDate(today(), -1)
    const first = serviceWith(new Map([[yesterday, okResult(yesterday)]]), { historyDays: 1 })
    await first.service.collect()

    const { service } = serviceWith(new Map([[today(), { ok: false, reason: 'source-down' }]]), {
      historyDays: 1,
    })
    const report = only(await service.collect())

    expect(report.failed).toEqual([{ date: today(), reason: 'source-down' }])
    expect(report.skipped).toEqual([yesterday])
    expect(await db.select().from(puzzles)).toHaveLength(1)
  })

  it('conta a data que a fonte não publica como indisponível, não como falha', async () => {
    const { service } = serviceWith(new Map([[today(), { ok: false, reason: 'unavailable' }]]))
    const report = only(await service.collect())

    expect(report.unavailable).toEqual([today()])
    expect(report.failed).toEqual([])
    expect(await db.select().from(puzzles)).toHaveLength(0)
  })

  it('não grava puzzle inconsistente da fonte', async () => {
    const broken = { ...okResult(today()), solution: { cells: [['A']] } }
    const { service } = serviceWith(new Map([[today(), broken]]))
    const report = only(await service.collect())

    expect(report.failed).toEqual([{ date: today(), reason: 'unexpected-format' }])
    expect(await db.select().from(puzzles)).toHaveLength(0)
  })
})

describe('collect (histórico dentro da janela)', () => {
  const dayOffset = (days: number) => addDaysToIsoDate(today(), -days)
  const windowOf = (days: number) =>
    Array.from({ length: days + 1 }, (_, offset) => dayOffset(offset))
  const okForAll = (dates: string[]) =>
    new Map<string, FetchPuzzleResult>(dates.map((date) => [date, okResult(date)]))

  it('guarda hoje e os 31 dias anteriores em ordem decrescente, com pausa entre os pedidos', async () => {
    const dates = windowOf(31)
    const pauses: number[] = []
    const { service, source } = serviceWith(okForAll(dates), {
      historyDays: 31,
      sleep: async (ms) => {
        pauses.push(ms)
      },
    })
    const report = only(await service.collect())

    expect(report.saved).toEqual(dates)
    expect(source.calls).toEqual(dates)
    expect(pauses).toHaveLength(31)
    expect(new Set(pauses)).toEqual(new Set([2000]))
    expect(await db.select().from(puzzles)).toHaveLength(32)
  })

  it('na segunda execução não faz nenhum pedido', async () => {
    const dates = windowOf(31)
    const { service, source } = serviceWith(okForAll(dates), { historyDays: 31 })
    await service.collect()
    source.calls.length = 0

    const report = only(await service.collect())
    expect(report.skipped).toHaveLength(32)
    expect(report.saved).toEqual([])
    expect(source.calls).toEqual([])
  })

  it('pede só as datas que faltam', async () => {
    const dates = windowOf(3)
    const first = serviceWith(okForAll([dates[1]!, dates[3]!]), { historyDays: 3 })
    await first.service.collect()

    const { service, source } = serviceWith(okForAll(dates), { historyDays: 3 })
    const report = only(await service.collect())

    expect(source.calls).toEqual([dates[0], dates[2]])
    expect(report.saved).toEqual([dates[0], dates[2]])
    expect(report.skipped).toEqual([dates[1], dates[3]])
  })

  it('data antiga indisponível não é falha e não interrompe', async () => {
    const dates = windowOf(3)
    const responses = okForAll(dates)
    responses.set(dates[2]!, { ok: false, reason: 'unavailable' })
    const { service } = serviceWith(responses, { historyDays: 3 })
    const report = only(await service.collect())

    expect(report.unavailable).toEqual([dates[2]])
    expect(report.failed).toEqual([])
    expect(report.saved).toEqual([dates[0], dates[1], dates[3]])
  })

  it('para no limite de uso da fonte e lista o que ficou pendente', async () => {
    const dates = windowOf(6)
    const responses = okForAll(dates)
    responses.set(dates[4]!, { ok: false, reason: 'rate-limited' })
    const { service, source } = serviceWith(responses, { historyDays: 6 })
    const report = only(await service.collect())

    expect(report.stoppedBy).toBe('rate-limited')
    expect(report.saved).toEqual(dates.slice(0, 4))
    expect(report.pending).toEqual(dates.slice(4))
    expect(source.calls).toEqual(dates.slice(0, 5))
  })

  it('outra falha numa data não impede as seguintes', async () => {
    const dates = windowOf(2)
    const responses = okForAll(dates)
    responses.set(dates[1]!, { ok: false, reason: 'source-down' })
    const { service } = serviceWith(responses, { historyDays: 2 })
    const report = only(await service.collect())

    expect(report.failed).toEqual([{ date: dates[1], reason: 'source-down' }])
    expect(report.saved).toEqual([dates[0], dates[2]])
    expect(report.stoppedBy).toBeUndefined()
  })

  it('com historyDays 3 considera quatro datas', async () => {
    const { service, source } = serviceWith(new Map(), { historyDays: 3 })
    await service.collect()
    expect(source.calls).toHaveLength(4)
  })
})

describe('collect (várias fontes)', () => {
  function twoSources(
    globo: Map<string, FetchPuzzleResult>,
    cruzada: Map<string, FetchPuzzleResult>,
    options: { historyDays?: number; throwOn?: ReadonlySet<string>; pauses?: number[] } = {},
  ) {
    const first = fakeSource(globo, { throwOn: options.throwOn })
    const second = fakeSource(cruzada, { id: 'cruzadaonline' })
    const service = createPuzzlesService({
      db,
      clock: clock.now,
      sources: [first, second],
      rateLimiter: createRateLimiter(createRateLimitRepository(db)),
      limits: defaultRateLimits,
      historyDays: options.historyDays ?? 0,
      sleep: async (ms) => {
        options.pauses?.push(ms)
      },
    })
    return { service, first, second }
  }

  it('coleta as duas fontes, na ordem, com pausa também entre elas', async () => {
    const pauses: number[] = []
    const { service } = twoSources(
      new Map([[today(), okResult(today())]]),
      new Map([[today(), okResult(today(), 'cruzadaonline')]]),
      { pauses },
    )
    const run = await service.collect()

    expect(run.sources.map((entry) => entry.source)).toEqual(['oglobo', 'cruzadaonline'])
    expect(run.sources.map((entry) => entry.report.saved)).toEqual([[today()], [today()]])
    expect(pauses).toEqual([2000])
    expect(await db.select().from(puzzles)).toHaveLength(2)
  })

  it('o limite de uso de uma fonte não interrompe a outra', async () => {
    const { service, second } = twoSources(
      new Map([[today(), { ok: false, reason: 'rate-limited' }]]),
      new Map([[today(), okResult(today(), 'cruzadaonline')]]),
    )
    const [globo, cruzada] = (await service.collect()).sources

    expect(globo?.report.stoppedBy).toBe('rate-limited')
    expect(cruzada?.report.saved).toEqual([today()])
    expect(second.calls).toEqual([today()])
  })

  it('um erro inesperado do adaptador vira falha daquela fonte e a coleta segue', async () => {
    const { service } = twoSources(
      new Map([[today(), okResult(today())]]),
      new Map([[today(), okResult(today(), 'cruzadaonline')]]),
      { throwOn: new Set([today()]) },
    )
    const [globo, cruzada] = (await service.collect()).sources

    expect(globo?.report.failed).toEqual([{ date: today(), reason: 'source-down' }])
    expect(cruzada?.report.saved).toEqual([today()])
  })

  it('a data guardada de uma fonte não conta como guardada na outra', async () => {
    const globoOnly = twoSources(new Map([[today(), okResult(today())]]), new Map())
    await globoOnly.service.collect()

    const { service, first, second } = twoSources(
      new Map([[today(), okResult(today())]]),
      new Map([[today(), okResult(today(), 'cruzadaonline')]]),
    )
    const [globo, cruzada] = (await service.collect()).sources

    expect(first.calls).toEqual([])
    expect(globo?.report.skipped).toEqual([today()])
    expect(second.calls).toEqual([today()])
    expect(cruzada?.report.saved).toEqual([today()])
  })

  it('com três fontes, a falha de uma não impede as outras (feature 029)', async () => {
    const pauses: number[] = []
    const service = createPuzzlesService({
      db,
      clock: clock.now,
      sources: [
        fakeSource(new Map([[today(), { ok: false, reason: 'source-down' }]])),
        fakeSource(new Map([[today(), okResult(today(), 'cruzadaonline')]]), {
          id: 'cruzadaonline',
        }),
        fakeSource(new Map([[today(), okResult(today(), 'cruzadasbrasil')]]), {
          id: 'cruzadasbrasil',
        }),
      ],
      rateLimiter: createRateLimiter(createRateLimitRepository(db)),
      limits: defaultRateLimits,
      historyDays: 0,
      sleep: async (ms) => {
        pauses.push(ms)
      },
    })
    const run = await service.collect()

    expect(run.sources.map((entry) => entry.source)).toEqual([
      'oglobo',
      'cruzadaonline',
      'cruzadasbrasil',
    ])
    expect(run.sources[0]?.report.failed).toEqual([{ date: today(), reason: 'source-down' }])
    expect(run.sources[2]?.report.saved).toEqual([today()])
    expect(pauses).toEqual([2000, 2000])
  })

  it('recusa duas fontes com o mesmo id', () => {
    expect(() =>
      createPuzzlesService({
        db,
        clock: clock.now,
        sources: [fakeSource(), fakeSource()],
        rateLimiter: createRateLimiter(createRateLimitRepository(db)),
        limits: defaultRateLimits,
      }),
    ).toThrow('fonte repetida: oglobo')
  })
})
