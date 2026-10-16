import { libraryItemSchema } from '@cruzadinha/shared'
import { describe, expect, it } from 'vitest'
import { toLibraryItem, toPublicLibraryItem, type LibraryRow } from './library.service'

const base: LibraryRow = {
  puzzleId: '0b9a3a4e-6d0e-4b6c-9a52-1f2e3d4c5b6a',
  date: '2026-10-13',
  level: 'daily',
  status: null,
  elapsedMs: null,
  finishedMs: null,
  completedAt: null,
  bestMs: null,
  bestAt: null,
  hasLetters: null,
}

const done = new Date('2026-10-13T14:03:22.000Z')
const bestDay = new Date('2026-10-10T09:12:45.000Z')

describe('toLibraryItem', () => {
  it('sem linha de progresso: não iniciado, sem tempos', () => {
    const item = toLibraryItem(base)
    expect(item).toEqual({
      puzzleId: base.puzzleId,
      date: '2026-10-13',
      level: 'daily',
      status: 'not_started',
      elapsedMs: null,
      finishedMs: null,
      completedAt: null,
      bestMs: null,
      bestAt: null,
    })
  })

  it('concluído: tempo final e hora da conclusão, sem tempo da partida', () => {
    const item = toLibraryItem({
      ...base,
      status: 'completed',
      elapsedMs: 412_000,
      finishedMs: 412_000,
      completedAt: done,
      bestMs: 398_000,
      bestAt: bestDay,
      hasLetters: true,
    })
    expect(item).toMatchObject({
      status: 'completed',
      elapsedMs: null,
      finishedMs: 412_000,
      completedAt: '2026-10-13T14:03:22.000Z',
      bestMs: 398_000,
      bestAt: '2026-10-10T09:12:45.000Z',
    })
  })

  it('em andamento com letras: traz o tempo acumulado', () => {
    const item = toLibraryItem({
      ...base,
      status: 'in_progress',
      elapsedMs: 83_000,
      hasLetters: true,
    })
    expect(item).toMatchObject({ status: 'in_progress', elapsedMs: 83_000, finishedMs: null })
  })

  it('em andamento sem letras: conta como não iniciado e sem tempo da partida', () => {
    const item = toLibraryItem({
      ...base,
      status: 'in_progress',
      elapsedMs: 0,
      hasLetters: false,
    })
    expect(item).toMatchObject({ status: 'not_started', elapsedMs: null })
  })

  it('reiniciado depois de concluir: não iniciado, mas o recorde continua', () => {
    const item = toLibraryItem({
      ...base,
      status: 'in_progress',
      elapsedMs: 0,
      bestMs: 398_000,
      bestAt: bestDay,
      hasLetters: false,
    })
    expect(item).toMatchObject({
      status: 'not_started',
      finishedMs: null,
      completedAt: null,
      bestMs: 398_000,
      bestAt: '2026-10-10T09:12:45.000Z',
    })
  })

  it('o resultado de cada situação respeita o contrato compartilhado', () => {
    const rows: LibraryRow[] = [
      base,
      { ...base, status: 'in_progress', elapsedMs: 5, hasLetters: true },
      {
        ...base,
        status: 'completed',
        finishedMs: 9,
        completedAt: done,
        bestMs: 9,
        bestAt: done,
        hasLetters: true,
      },
    ]
    for (const row of rows) {
      expect(libraryItemSchema.safeParse(toLibraryItem(row)).success).toBe(true)
    }
  })
})

describe('toPublicLibraryItem', () => {
  it('sem sessão: sempre não iniciado e sem tempos', () => {
    const item = toPublicLibraryItem({ puzzleId: base.puzzleId, date: base.date, level: 'daily' })
    expect(item).toEqual({
      puzzleId: base.puzzleId,
      date: '2026-10-13',
      level: 'daily',
      status: 'not_started',
      elapsedMs: null,
      finishedMs: null,
      completedAt: null,
      bestMs: null,
      bestAt: null,
    })
    expect(libraryItemSchema.safeParse(item).success).toBe(true)
  })
})
