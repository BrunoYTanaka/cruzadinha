import { describe, expect, it } from 'vitest'
import type { GuestProgress } from '../../../domain/guest/guest-progress'
import { summarizeGuest } from './summarize'
import { toImportItem } from './to-import-item'

const record: GuestProgress = {
  v: 1,
  puzzleId: '0b9a3a4e-6d0e-4b6c-9a52-1f2e3d4c5b6a',
  date: '2026-10-16',
  cells: [['A', null]],
  elapsedMs: 5_000,
  status: 'in_progress',
  savedAt: '2026-10-16T12:00:00.000Z',
  completedAt: null,
  finishedMs: null,
  bestMs: null,
  bestAt: null,
  help: { usage: { letters: 1, words: 0 }, marks: {}, locked: [] },
  game: 2,
}

describe('toImportItem', () => {
  it('leva só os campos da conta, sem ajudas nem geração', () => {
    const item = toImportItem(record)
    expect(item).not.toBeNull()
    expect(item).not.toHaveProperty('help')
    expect(item).not.toHaveProperty('game')
    expect(item).not.toHaveProperty('date')
  })

  it('devolve null para registro que o contrato recusa', () => {
    expect(toImportItem({ ...record, status: 'completed' })).toBeNull()
  })
})

describe('summarizeGuest', () => {
  it('conta concluídas e em andamento', () => {
    const done = { ...record, status: 'completed' as const }
    expect(summarizeGuest([record, done, done])).toEqual({
      total: 3,
      completed: 2,
      inProgress: 1,
    })
    expect(summarizeGuest([])).toEqual({ total: 0, completed: 0, inProgress: 0 })
  })
})
