import { describe, expect, it } from 'vitest'
import { computeStats, type StatsRow } from './compute-stats'

// 2026-10-30 12:00 em Brasília (UTC-3).
const NOW = new Date('2026-10-30T15:00:00Z')

const done = (completedAt: string, finishedMs = 1000, source: StatsRow['source'] = 'oglobo') =>
  ({ source, status: 'completed', finishedMs, completedAt, bestMs: finishedMs }) satisfies StatsRow

describe('computeStats', () => {
  it('conta dias seguidos até hoje', () => {
    const s = computeStats(
      [done('2026-10-30T13:00:00Z'), done('2026-10-29T13:00:00Z'), done('2026-10-28T13:00:00Z')],
      NOW,
    )
    expect(s.streak).toEqual({ current: 3, longest: 3 })
  })

  it('mantém a sequência quando só ontem tem conclusão', () => {
    expect(computeStats([done('2026-10-29T13:00:00Z')], NOW).streak.current).toBe(1)
  })

  it('zera a atual após um dia em branco e guarda a maior', () => {
    const s = computeStats([done('2026-10-27T13:00:00Z'), done('2026-10-26T13:00:00Z')], NOW)
    expect(s.streak).toEqual({ current: 0, longest: 2 })
  })

  it('conta um dia só uma vez', () => {
    const s = computeStats([done('2026-10-30T13:00:00Z'), done('2026-10-30T14:00:00Z')], NOW)
    expect(s.streak).toEqual({ current: 1, longest: 1 })
  })

  it('usa o dia de Brasília na virada', () => {
    // 02:00Z de 31/10 ainda é 30/10 em Brasília.
    expect(computeStats([done('2026-10-31T02:00:00Z')], NOW).streak.current).toBe(1)
  })

  it('soma total e média só das concluídas e o recorde de todas', () => {
    const restarted: StatsRow = {
      source: 'oglobo',
      status: 'in_progress',
      finishedMs: null,
      completedAt: null,
      bestMs: 500,
    }
    const s = computeStats(
      [done('2026-10-30T13:00:00Z', 1000), done('2026-10-29T13:00:00Z', 2000, 'clube'), restarted],
      NOW,
    )
    expect(s.total).toBe(2)
    expect(s.averageMs).toBe(1500)
    expect(s.bySource.find((x) => x.source === 'oglobo')).toEqual({
      source: 'oglobo',
      total: 1,
      averageMs: 1000,
      bestMs: 500,
    })
  })

  it('devolve zeros e nulos sem dados, com todas as fontes', () => {
    const s = computeStats([], NOW)
    expect(s.streak).toEqual({ current: 0, longest: 0 })
    expect(s.averageMs).toBeNull()
    expect(s.bySource).toHaveLength(4)
    expect(s.bySource.every((x) => x.total === 0 && x.bestMs === null)).toBe(true)
  })
})
