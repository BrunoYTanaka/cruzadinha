import { afterAll, beforeEach, describe, expect, it } from 'vitest'
import { puzzles } from '../db/schema'
import { addDaysToIsoDate, todayInSaoPaulo } from '../lib/dates'
import { defaultRateLimits } from '../modules/rate-limit/limits'
import { createRateLimitRepository } from '../modules/rate-limit/rate-limit.repository'
import { createRateLimiter } from '../modules/rate-limit/rate-limit.service'
import { createPuzzlesService } from '../modules/puzzles/puzzles.service'
import type { CollectErrorHandler, CollectRun } from '../modules/puzzles/puzzles.service'
import type { FetchPuzzleResult } from '../sources/types'
import { fakeListedSource, fakeSource, okResult, type FakeListedSource } from './fake-source'
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
    options: {
      historyDays?: number
      throwOn?: ReadonlySet<string>
      pauses?: number[]
      onError?: CollectErrorHandler
    } = {},
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
      onError: options.onError,
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

  it('entrega o erro inesperado do adaptador ao gancho com a fonte e a data', async () => {
    const seen: Parameters<CollectErrorHandler>[0][] = []
    const { service } = twoSources(
      new Map([[today(), okResult(today())]]),
      new Map([[today(), okResult(today(), 'cruzadaonline')]]),
      { throwOn: new Set([today()]), onError: (info) => seen.push(info) },
    )
    await service.collect()

    expect(seen).toHaveLength(1)
    expect(seen[0]).toMatchObject({ source: 'oglobo', date: today() })
    expect(seen[0]?.error).toBeInstanceOf(Error)
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

describe('collect (fonte que lista edições, feature 030)', () => {
  const dayOffset = (days: number) => addDaysToIsoDate(today(), -days)

  function withListed(
    listed: FakeListedSource,
    options: {
      historyDays?: number
      pauses?: number[]
      others?: ReturnType<typeof fakeSource>[]
      onError?: CollectErrorHandler
    } = {},
  ) {
    return createPuzzlesService({
      db,
      clock: clock.now,
      sources: [...(options.others ?? []), listed],
      rateLimiter: createRateLimiter(createRateLimitRepository(db)),
      limits: defaultRateLimits,
      historyDays: options.historyDays ?? 31,
      onError: options.onError,
      sleep: async (ms) => {
        options.pauses?.push(ms)
      },
    })
  }

  const lastReport = (run: CollectRun) => run.sources[run.sources.length - 1]!.report

  it('salva cada edição pela data da página, da mais nova à mais antiga', async () => {
    const dates = [dayOffset(0), dayOffset(7), dayOffset(14)]
    const source = fakeListedSource(dates.map((date) => ({ date })))
    const report = lastReport(await withListed(source).collect())

    expect(report.saved).toEqual(dates)
    expect(source.loaded).toEqual(dates)
    const rows = await db.select().from(puzzles)
    expect(rows.map((row) => [row.source, row.date]).sort()).toEqual(
      dates.map((date) => ['clube', date]).sort(),
    )
  })

  it('só vai até o início da janela', async () => {
    const source = fakeListedSource([{ date: dayOffset(2) }, { date: dayOffset(40) }])
    const report = lastReport(await withListed(source, { historyDays: 31 }).collect())

    expect(report.saved).toEqual([dayOffset(2)])
    expect(source.listed).toEqual([dayOffset(2)])
  })

  it('edição já salva não tem o puzzle pedido de novo', async () => {
    const dates = [dayOffset(0), dayOffset(7)]
    const first = fakeListedSource(dates.map((date) => ({ date })))
    await withListed(first).collect()

    const second = fakeListedSource(dates.map((date) => ({ date })))
    const report = lastReport(await withListed(second).collect())

    expect(report.saved).toEqual([])
    expect(report.skipped).toEqual(dates)
    expect(second.listed).toEqual(dates)
    expect(second.loaded).toEqual([])
    expect(await db.select().from(puzzles)).toHaveLength(2)
  })

  it('preenche uma edição antiga que faltava mesmo havendo uma mais nova salva', async () => {
    const newer = fakeListedSource([{ date: dayOffset(0) }])
    await withListed(newer).collect()

    const both = fakeListedSource([{ date: dayOffset(0) }, { date: dayOffset(7) }])
    const report = lastReport(await withListed(both).collect())

    expect(report.saved).toEqual([dayOffset(7)])
    expect(report.skipped).toEqual([dayOffset(0)])
  })

  it('duas edições na mesma data: a primeira fica e a outra conta como já salva', async () => {
    const date = dayOffset(1)
    const source = fakeListedSource([{ date }, { date }])
    const report = lastReport(await withListed(source).collect())

    expect(report.saved).toEqual([date])
    expect(report.skipped).toEqual([date])
    expect(await db.select().from(puzzles)).toHaveLength(1)
  })

  it('edição com data futura não é salva', async () => {
    const future = addDaysToIsoDate(today(), 3)
    const source = fakeListedSource([{ date: future }, { date: dayOffset(1) }])
    const report = lastReport(await withListed(source).collect())

    expect(report.unavailable).toEqual([future])
    expect(report.saved).toEqual([dayOffset(1)])
  })

  it('faz a pausa de 2 s antes de cada pedido, lista e edições', async () => {
    const pauses: number[] = []
    const source = fakeListedSource([{ date: dayOffset(0) }, { date: dayOffset(7) }])
    await withListed(source, { pauses }).collect()

    // lista + 2 páginas + 2 scripts = 5 pedidos, 4 pausas.
    expect(pauses).toEqual([2000, 2000, 2000, 2000])
  })

  it('não grava puzzle inconsistente', async () => {
    const date = dayOffset(0)
    const broken = { ...okResult(date, 'clube'), solution: { cells: [['A']] } }
    const source = fakeListedSource([{ date, result: broken }])
    const report = lastReport(await withListed(source).collect())

    expect(report.failed).toEqual([{ date, reason: 'unexpected-format' }])
    expect(await db.select().from(puzzles)).toHaveLength(0)
  })

  it('limite de uso do script interrompe a fonte e deixa a data pendente', async () => {
    const dates = [dayOffset(0), dayOffset(7)]
    const source = fakeListedSource([
      { date: dates[0]! },
      { date: dates[1]!, result: { ok: false, reason: 'rate-limited' } },
    ])
    const report = lastReport(await withListed(source).collect())

    expect(report.saved).toEqual([dates[0]])
    expect(report.stoppedBy).toBe('rate-limited')
    expect(report.pending).toEqual([dates[1]])
  })

  it('falha da lista vira falha da fonte e limite da lista interrompe', async () => {
    const down = fakeListedSource([], {
      failure: { ok: false, reason: 'source-down', detail: 'x' },
    })
    expect(lastReport(await withListed(down).collect()).failed).toEqual([
      { date: today(), reason: 'source-down' },
    ])
    const limited = fakeListedSource([], {
      failure: { ok: false, reason: 'rate-limited', detail: 'HTTP 429' },
    })
    expect(lastReport(await withListed(limited).collect()).stoppedBy).toBe('rate-limited')
  })

  it('erro inesperado do adaptador não impede a coleta das outras fontes', async () => {
    const globo = fakeSource(new Map([[today(), okResult(today())]]))
    const boom = fakeListedSource([{ date: today() }], { throwOnList: true })
    const run = await withListed(boom, { others: [globo] }).collect()

    expect(run.sources[0]?.report.saved).toEqual([today()])
    expect(run.sources[1]?.report.failed).toEqual([{ date: today(), reason: 'source-down' }])
  })

  it('entrega ao gancho o erro de uma fonte listada', async () => {
    const seen: Parameters<CollectErrorHandler>[0][] = []
    const boom = fakeListedSource([{ date: today() }], { throwOnList: true })
    await withListed(boom, { onError: (info) => seen.push(info) }).collect()

    expect(seen).toHaveLength(1)
    expect(seen[0]).toMatchObject({ source: 'clube', date: today() })
  })

  it('uma falha ao carregar uma edição não impede a coleta das outras fontes', async () => {
    const globo = fakeSource(new Map([[today(), okResult(today())]]))
    const source = fakeListedSource([{ date: today() }], { throwOnLoad: new Set([today()]) })
    const run = await withListed(source, { others: [globo] }).collect()

    expect(run.sources[0]?.report.saved).toEqual([today()])
    expect(run.sources[1]?.report.failed).toEqual([{ date: today(), reason: 'source-down' }])
  })
})
