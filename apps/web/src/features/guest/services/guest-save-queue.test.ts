import { afterEach, describe, expect, it, vi } from 'vitest'
import type { GuestProgress } from '../../../domain/guest/guest-progress'
import { createGuestSaveQueue } from './guest-save-queue'
import { createGuestStore } from './guest-store'

const PUZZLE_ID = '0b9a3a4e-6d0e-4b6c-9a52-1f2e3d4c5b6a'
const snapshot = {
  cells: [
    ['A', null],
    [null, null],
  ],
  elapsedMs: 5_000,
  status: 'in_progress' as const,
}
const help = { usage: { letters: 1, words: 0 }, marks: { '0,0': 'helped' as const }, locked: [] }

afterEach(() => {
  vi.unstubAllGlobals()
})

function queueWith(store = createGuestStore()) {
  const saved: GuestProgress[] = []
  const queue = createGuestSaveQueue({
    puzzleId: PUZZLE_ID,
    date: '2026-10-16',
    store,
    onSaved: (record) => saved.push(record),
  })
  return { queue, store, saved }
}

describe('createGuestSaveQueue', () => {
  it('grava na hora no navegador, com as ajudas, sem rede', async () => {
    const fetch = vi.fn()
    vi.stubGlobal('fetch', fetch)
    const { queue, store, saved } = queueWith()
    queue.schedule({ ...snapshot, help } as typeof snapshot)
    await vi.waitFor(() => expect(saved).toHaveLength(1))
    expect(await store.get(PUZZLE_ID)).toMatchObject({ elapsedMs: 5_000, help })
    expect(queue.getState()).toBe('saved')
    expect(fetch).not.toHaveBeenCalled()
  })

  it('sendNow espera a gravação e avisa a conclusão', async () => {
    const { queue, saved } = queueWith()
    await queue.sendNow({ ...snapshot, status: 'completed' })
    expect(saved.at(-1)).toMatchObject({ status: 'completed', finishedMs: 5_000, bestMs: 5_000 })
  })

  it('sem armazenamento fica "local-only" e continua aceitando gravações', async () => {
    const { queue, saved } = queueWith(createGuestStore({ factory: () => undefined }))
    const states: string[] = []
    queue.subscribe(() => states.push(queue.getState()))
    await queue.sendNow(snapshot)
    expect(queue.getState()).toBe('local-only')
    expect(states).toEqual(['local-only'])
    expect(saved).toHaveLength(1)
  })

  it('nunca entra nos estados da fila do servidor', async () => {
    const { queue } = queueWith()
    await queue.retry()
    expect(queue.readOutbox()).toBeNull()
    expect(['saved', 'local-only']).toContain(queue.getState())
  })
})
