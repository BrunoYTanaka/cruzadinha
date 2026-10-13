import { afterAll, beforeEach, describe, expect, it } from 'vitest'
import { puzzles } from '../db/schema'
import { addDaysToIsoDate, todayInSaoPaulo } from '../lib/dates'
import { defaultRateLimits } from '../modules/rate-limit/limits'
import { createRateLimitRepository } from '../modules/rate-limit/rate-limit.repository'
import { createRateLimiter } from '../modules/rate-limit/rate-limit.service'
import { createPuzzlesService } from '../modules/puzzles/puzzles.service'
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

function serviceWith(
  responses: Map<string, FetchPuzzleResult>,
  options: { historyDays?: number; sleep?: (ms: number) => Promise<void> } = {},
) {
  const source = fakeSource(responses)
  const service = createPuzzlesService({
    db,
    clock: clock.now,
    source,
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
    const report = await service.collect()

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

    const report = await service.collect()
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
    const report = await service.collect()

    expect(report.failed).toEqual([{ date: today(), reason: 'source-down' }])
    expect(report.skipped).toEqual([yesterday])
    expect(await db.select().from(puzzles)).toHaveLength(1)
  })

  it('conta a data que a fonte não publica como indisponível, não como falha', async () => {
    const { service } = serviceWith(new Map([[today(), { ok: false, reason: 'unavailable' }]]))
    const report = await service.collect()

    expect(report.unavailable).toEqual([today()])
    expect(report.failed).toEqual([])
    expect(await db.select().from(puzzles)).toHaveLength(0)
  })

  it('não grava puzzle inconsistente da fonte', async () => {
    const broken = { ...okResult(today()), solution: { cells: [['A']] } }
    const { service } = serviceWith(new Map([[today(), broken]]))
    const report = await service.collect()

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
    const report = await service.collect()

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

    const report = await service.collect()
    expect(report.skipped).toHaveLength(32)
    expect(report.saved).toEqual([])
    expect(source.calls).toEqual([])
  })

  it('pede só as datas que faltam', async () => {
    const dates = windowOf(3)
    const first = serviceWith(okForAll([dates[1]!, dates[3]!]), { historyDays: 3 })
    await first.service.collect()

    const { service, source } = serviceWith(okForAll(dates), { historyDays: 3 })
    const report = await service.collect()

    expect(source.calls).toEqual([dates[0], dates[2]])
    expect(report.saved).toEqual([dates[0], dates[2]])
    expect(report.skipped).toEqual([dates[1], dates[3]])
  })

  it('data antiga indisponível não é falha e não interrompe', async () => {
    const dates = windowOf(3)
    const responses = okForAll(dates)
    responses.set(dates[2]!, { ok: false, reason: 'unavailable' })
    const { service } = serviceWith(responses, { historyDays: 3 })
    const report = await service.collect()

    expect(report.unavailable).toEqual([dates[2]])
    expect(report.failed).toEqual([])
    expect(report.saved).toEqual([dates[0], dates[1], dates[3]])
  })

  it('para no limite de uso da fonte e lista o que ficou pendente', async () => {
    const dates = windowOf(6)
    const responses = okForAll(dates)
    responses.set(dates[4]!, { ok: false, reason: 'rate-limited' })
    const { service, source } = serviceWith(responses, { historyDays: 6 })
    const report = await service.collect()

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
    const report = await service.collect()

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
