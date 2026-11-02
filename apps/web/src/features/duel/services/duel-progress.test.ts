import { IDBFactory } from 'fake-indexeddb'
import { describe, expect, it, vi } from 'vitest'
import { ApiRequestError } from '../../../shared/services/api/client/client'
import { makeDuelView } from '../../../test/duel-fixtures'
import { createGuestStore } from '../../guest'
import { duelQueueFactory, finishWithRetry } from './duel-progress'

const PUZZLE = '0b9a3a4e-6d0e-4b6c-9a52-1f2e3d4c5b6a'
const A = '3b9d6bcd-bbfd-4b2d-9b5d-ab8dfbbd4bed'
const B = '6f1d1e53-52f3-4b47-bd7c-4c0f7e4b2a10'
const cells = [['C', 'A']]
const done = (help: { usage: { letters: number; words: number } } | null = null) => ({
  cells,
  elapsedMs: 5000,
  status: 'completed' as const,
  help,
})

function setup(finish = vi.fn(async () => makeDuelView())) {
  const factory = new IDBFactory()
  const store = createGuestStore({ factory: () => factory })
  const onFinished = vi.fn()
  const sleep = vi.fn(async () => {})
  const make = (duelId: string) =>
    duelQueueFactory({ duelId, finish, onFinished, sleep })({
      puzzleId: PUZZLE,
      date: '2026-10-14',
      store,
    })
  return { store, make, finish, onFinished, sleep }
}

describe('duelQueueFactory', () => {
  it('guarda o jogo pelo id do duelo, nunca pelo da cruzada', async () => {
    const { store, make } = setup()
    const queue = make(A)
    await queue.sendNow({ cells, elapsedMs: 1000, status: 'in_progress' })
    expect(await store.get(A)).toMatchObject({ cells })
    expect(await store.get(PUZZLE)).toBeNull()
  })

  it('dois duelos da mesma cruzada não misturam o progresso', async () => {
    const { store, make } = setup()
    await make(A).sendNow({ cells: [['A', null]], elapsedMs: 1, status: 'in_progress' })
    await make(B).sendNow({ cells: [['B', null]], elapsedMs: 1, status: 'in_progress' })
    expect((await store.get(A))?.cells[0]?.[0]).toBe('A')
    expect((await store.get(B))?.cells[0]?.[0]).toBe('B')
  })

  it('na conclusão envia ao servidor as ajudas declaradas e avisa a tela', async () => {
    const { make, finish, onFinished } = setup()
    await make(A).sendNow(done({ usage: { letters: 2, words: 1 } }))
    await vi.waitFor(() => expect(onFinished).toHaveBeenCalled())
    expect(finish).toHaveBeenCalledWith(3)
  })

  it('sem rede tenta de novo até dar certo e mostra "sem conexão" enquanto espera', async () => {
    const finish = vi
      .fn()
      .mockRejectedValueOnce(new ApiRequestError(0))
      .mockRejectedValueOnce(new ApiRequestError(503))
      .mockResolvedValue(makeDuelView())
    const { make, onFinished, sleep } = setup(finish)
    const queue = make(A)
    await queue.sendNow(done())
    await vi.waitFor(() => expect(onFinished).toHaveBeenCalledWith(expect.objectContaining({})))
    expect(finish).toHaveBeenCalledTimes(3)
    expect(sleep).toHaveBeenCalledTimes(2)
    expect(queue.getState()).toBe('saved')
  })
})

describe('finishWithRetry', () => {
  it('erro 4xx encerra sem repetir e avisa com null', async () => {
    const finish = vi.fn().mockRejectedValue(new ApiRequestError(409, { code: 'not-running' }))
    const onFinished = vi.fn()
    await finishWithRetry(0, { finish, onFinished, sleep: async () => {} })
    expect(finish).toHaveBeenCalledTimes(1)
    expect(onFinished).toHaveBeenCalledWith(null)
  })

  it('429 é tentado de novo', async () => {
    const finish = vi
      .fn()
      .mockRejectedValueOnce(new ApiRequestError(429))
      .mockResolvedValue(makeDuelView())
    const onFinished = vi.fn()
    await finishWithRetry(0, { finish, onFinished, sleep: async () => {} })
    expect(finish).toHaveBeenCalledTimes(2)
  })

  it('para quando a tela é desmontada', async () => {
    const finish = vi.fn().mockRejectedValue(new ApiRequestError(0))
    let stopped = false
    await finishWithRetry(0, {
      finish,
      onFinished: vi.fn(),
      sleep: async () => {
        stopped = true
      },
      isStopped: () => stopped,
    })
    expect(finish).toHaveBeenCalledTimes(1)
  })
})
