import { describe, expect, it } from 'vitest'
import type { GuestProgress } from '../../game-logic/guest-progress'
import { makeLibraryItem } from '../../test/fixtures'
import { mergeGuestLibrary } from './guest-library'

const items = [
  makeLibraryItem('2026-10-14'),
  makeLibraryItem('2026-10-13'),
  makeLibraryItem('2026-10-12'),
]
const [today, yesterday, before] = items.map((item) => item.puzzleId)

function record(
  puzzleId: string | undefined,
  overrides: Partial<GuestProgress> = {},
): GuestProgress {
  return {
    v: 1,
    puzzleId: puzzleId ?? '',
    date: '2026-10-14',
    cells: [['A', null]],
    elapsedMs: 5_000,
    status: 'in_progress',
    savedAt: '2026-10-14T12:00:00.000Z',
    completedAt: null,
    finishedMs: null,
    bestMs: null,
    bestAt: null,
    help: null,
    ...overrides,
  }
}

describe('mergeGuestLibrary', () => {
  it('sem registro: não iniciado e sem tempos', () => {
    expect(mergeGuestLibrary(items, [])).toEqual(items)
  })

  it('em andamento com letras: tempo decorrido e recorde', () => {
    const [first] = mergeGuestLibrary(items, [
      record(today, { bestMs: 300_000, bestAt: '2026-10-10T09:00:00.000Z' }),
    ])
    expect(first).toMatchObject({
      status: 'in_progress',
      elapsedMs: 5_000,
      finishedMs: null,
      completedAt: null,
      bestMs: 300_000,
      bestAt: '2026-10-10T09:00:00.000Z',
    })
  })

  it('em andamento sem nenhuma letra: não iniciado, só com o recorde', () => {
    const merged = mergeGuestLibrary(items, [
      record(yesterday, {
        cells: [[null, null]],
        bestMs: 300_000,
        bestAt: '2026-10-10T09:00:00.000Z',
      }),
    ])
    expect(merged[1]).toMatchObject({ status: 'not_started', elapsedMs: null, bestMs: 300_000 })
  })

  it('concluída: tempo final, hora da conclusão e recorde', () => {
    const merged = mergeGuestLibrary(items, [
      record(before, {
        status: 'completed',
        finishedMs: 412_000,
        completedAt: '2026-10-12T14:03:22.000Z',
        bestMs: 398_000,
        bestAt: '2026-10-10T09:12:45.000Z',
      }),
    ])
    expect(merged[2]).toMatchObject({
      status: 'completed',
      elapsedMs: null,
      finishedMs: 412_000,
      completedAt: '2026-10-12T14:03:22.000Z',
      bestMs: 398_000,
    })
  })

  it('ignora registros de cruzadas que não estão na lista', () => {
    const merged = mergeGuestLibrary(items, [record('00000000-0000-4000-8000-000000000999')])
    expect(merged).toEqual(items)
  })
})
