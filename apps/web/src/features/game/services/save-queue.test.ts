import type { Progress, ProgressEnvelope, SaveProgressRequest } from '@cruzadinha/shared'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { ApiRequestError } from '../../../shared/services/api/client/client'
import { aUser } from '../../../test/render'
import { cellsFrom, makeProgress, PUZZLE_ID } from '../../../test/fixtures'
import { createSaveQueue, outboxKey, type SaveFn, type SaveSnapshot } from './save-queue'

const LOCAL_NOW = Date.parse('2026-10-14T12:00:00.000Z')
const snapshot = (letters: string, overrides: Partial<SaveSnapshot> = {}): SaveSnapshot => ({
  cells: cellsFrom([letters, '.#.', '...']),
  elapsedMs: 1000,
  status: 'in_progress',
  ...overrides,
})

const ok = (progress: Progress | null = makeProgress()): ProgressEnvelope => ({ progress })

function setup(save: SaveFn, extra: { offset?: number } = {}) {
  const onProgress = vi.fn()
  const queue = createSaveQueue({
    puzzleId: PUZZLE_ID,
    userId: aUser.id,
    save,
    now: () => Date.now(),
    serverClockOffsetMs: () => extra.offset ?? 0,
    onProgress,
  })
  return { queue, onProgress }
}

beforeEach(() => {
  vi.useFakeTimers()
  vi.setSystemTime(LOCAL_NOW)
})

afterEach(() => {
  vi.restoreAllMocks()
  vi.useRealTimers()
  window.localStorage.clear()
})

const key = outboxKey(aUser.id, PUZZLE_ID)

describe('createSaveQueue', () => {
  it('espera 1,5 s depois da última mudança e envia só o último estado', async () => {
    const save = vi.fn<SaveFn>(async () => ok())
    const { queue, onProgress } = setup(save)
    queue.schedule(snapshot('C..'))
    await vi.advanceTimersByTimeAsync(1000)
    queue.schedule(snapshot('CA.'))
    await vi.advanceTimersByTimeAsync(1000)
    expect(save).not.toHaveBeenCalled()
    await vi.advanceTimersByTimeAsync(500)
    expect(save).toHaveBeenCalledTimes(1)
    const body = save.mock.calls[0]?.[1] as SaveProgressRequest
    expect(body.cells[0]).toEqual(['C', 'A', null])
    expect(queue.getState()).toBe('saved')
    expect(onProgress).toHaveBeenCalledTimes(1)
  })

  it('mostra "saving" enquanto espera e depois "saved"', async () => {
    const save = vi.fn<SaveFn>(async () => ok())
    const { queue } = setup(save)
    const states: string[] = []
    queue.subscribe(() => states.push(queue.getState()))
    queue.schedule(snapshot('C..'))
    await vi.advanceTimersByTimeAsync(2000)
    expect(states).toEqual(['saving', 'saved'])
  })

  it('envia já com keepalive ao sair da página e limpa a fila local depois', async () => {
    let seenOutbox: string | null = null
    const save = vi.fn<SaveFn>(async () => {
      seenOutbox = window.localStorage.getItem(key)
      return ok()
    })
    const { queue } = setup(save)
    await queue.sendNow(snapshot('CA.'), { keepalive: true })
    expect(save).toHaveBeenCalledTimes(1)
    expect(save.mock.calls[0]?.[2]).toEqual({ keepalive: true })
    expect(seenOutbox).not.toBeNull() // a fila local já tinha o corpo quando o envio saiu
    expect(window.localStorage.getItem(key)).toBeNull()
  })

  it('corrige o savedAt pelo desvio do relógio do servidor', async () => {
    // o aparelho está 10 minutos adiantado em relação ao servidor
    const save = vi.fn<SaveFn>(async () => ok())
    const { queue } = setup(save, { offset: -10 * 60 * 1000 })
    queue.schedule(snapshot('C..'))
    await vi.advanceTimersByTimeAsync(1500)
    const body = save.mock.calls[0]?.[1] as SaveProgressRequest
    expect(body.savedAt).toBe(new Date(LOCAL_NOW + 1500 - 10 * 60 * 1000 - 1500).toISOString())
    expect(Date.parse(body.savedAt)).toBeLessThan(Date.now())
  })

  it('num 400 invalid-input repete uma vez com a hora corrigida', async () => {
    const save = vi
      .fn<SaveFn>()
      .mockRejectedValueOnce(
        new ApiRequestError(400, { code: 'invalid-input', fields: ['savedAt'] }),
      )
      .mockResolvedValueOnce(ok())
    const { queue } = setup(save)
    queue.schedule(snapshot('C..'))
    await vi.advanceTimersByTimeAsync(1500)
    expect(save).toHaveBeenCalledTimes(2)
    expect(queue.getState()).toBe('saved')
  })

  it('um 400 que persiste não entra em laço de repetição', async () => {
    const save = vi
      .fn<SaveFn>()
      .mockRejectedValue(new ApiRequestError(400, { code: 'invalid-input' }))
    const { queue } = setup(save)
    queue.schedule(snapshot('C..'))
    await vi.advanceTimersByTimeAsync(60_000)
    expect(save).toHaveBeenCalledTimes(2)
    expect(queue.getState()).toBe('offline')
  })

  it('falha de rede guarda o corpo no aparelho e repete com espera crescente', async () => {
    const save = vi
      .fn<SaveFn>()
      .mockRejectedValueOnce(new ApiRequestError(0))
      .mockRejectedValueOnce(new ApiRequestError(0))
      .mockResolvedValueOnce(ok())
    const { queue } = setup(save)
    queue.schedule(snapshot('CA.'))
    await vi.advanceTimersByTimeAsync(1500)
    expect(queue.getState()).toBe('offline')
    expect(JSON.parse(window.localStorage.getItem(key) ?? 'null')).toMatchObject({
      cells: cellsFrom(['CA.', '.#.', '...']),
    })
    await vi.advanceTimersByTimeAsync(999)
    expect(save).toHaveBeenCalledTimes(1)
    await vi.advanceTimersByTimeAsync(1) // 1 s depois da primeira falha
    expect(save).toHaveBeenCalledTimes(2)
    await vi.advanceTimersByTimeAsync(1999)
    expect(save).toHaveBeenCalledTimes(2)
    await vi.advanceTimersByTimeAsync(1) // mais 2 s
    expect(save).toHaveBeenCalledTimes(3)
    expect(queue.getState()).toBe('saved')
    expect(window.localStorage.getItem(key)).toBeNull()
  })

  it('o 5xx também fica na fila e a espera nunca passa de 30 s', async () => {
    const save = vi.fn<SaveFn>().mockRejectedValue(new ApiRequestError(503))
    const { queue } = setup(save)
    queue.schedule(snapshot('C..'))
    await vi.advanceTimersByTimeAsync(1500)
    // 1 + 2 + 4 + 8 + 16 + 30 + 30 s depois de falhar sete vezes seguidas
    await vi.advanceTimersByTimeAsync(1000 + 2000 + 4000 + 8000 + 16000 + 30000 + 30000)
    expect(save).toHaveBeenCalledTimes(8)
    expect(queue.getState()).toBe('offline')
  })

  it('409 num corpo in_progress para o reenvio, mantém as letras e sinaliza "outro aparelho"', async () => {
    const save = vi
      .fn<SaveFn>()
      .mockRejectedValue(new ApiRequestError(409, { code: 'progress-completed' }))
    const { queue } = setup(save)
    queue.schedule(snapshot('CA.'))
    await vi.advanceTimersByTimeAsync(1500)
    expect(queue.getState()).toBe('completed-elsewhere')
    await vi.advanceTimersByTimeAsync(120_000)
    expect(save).toHaveBeenCalledTimes(1)
    expect(window.localStorage.getItem(key)).not.toBeNull()
    // o jogo segue: novas letras vão para a fila local, sem novas chamadas
    queue.schedule(snapshot('CAL'))
    await vi.advanceTimersByTimeAsync(5000)
    expect(save).toHaveBeenCalledTimes(1)
    expect(JSON.parse(window.localStorage.getItem(key) ?? 'null').cells[0]).toEqual(['C', 'A', 'L'])
  })

  it('401 mantém a fila, sinaliza "sessão expirada" e só reenvia no retry', async () => {
    const save = vi
      .fn<SaveFn>()
      .mockRejectedValueOnce(new ApiRequestError(401, { code: 'unauthenticated' }))
      .mockResolvedValue(ok())
    const { queue } = setup(save)
    queue.schedule(snapshot('CA.'))
    await vi.advanceTimersByTimeAsync(1500)
    expect(queue.getState()).toBe('session-expired')
    await vi.advanceTimersByTimeAsync(60_000)
    expect(save).toHaveBeenCalledTimes(1)
    expect(window.localStorage.getItem(key)).not.toBeNull()

    await queue.retry()
    expect(save).toHaveBeenCalledTimes(2)
    expect(queue.getState()).toBe('saved')
    expect(window.localStorage.getItem(key)).toBeNull()
    const resent = save.mock.calls[1]?.[1] as SaveProgressRequest
    expect(resent.cells[0]).toEqual(['C', 'A', null])
  })

  it('o que chega durante um envio em andamento segue logo depois', async () => {
    let release: (value: ProgressEnvelope) => void = () => {}
    const save = vi
      .fn<SaveFn>()
      .mockImplementationOnce(() => new Promise<ProgressEnvelope>((resolve) => (release = resolve)))
      .mockResolvedValue(ok())
    const { queue } = setup(save)
    queue.schedule(snapshot('C..'))
    await vi.advanceTimersByTimeAsync(1500)
    expect(save).toHaveBeenCalledTimes(1)
    queue.schedule(snapshot('CAL'))
    await vi.advanceTimersByTimeAsync(1500)
    expect(save).toHaveBeenCalledTimes(1) // ainda esperando o primeiro
    release(ok())
    await vi.advanceTimersByTimeAsync(0)
    expect(save).toHaveBeenCalledTimes(2)
    expect((save.mock.calls[1]?.[1] as SaveProgressRequest).cells[0]).toEqual(['C', 'A', 'L'])
  })

  it('a conclusão sai na hora, sem esperar o debounce', async () => {
    const save = vi.fn<SaveFn>(async () =>
      ok(makeProgress({ status: 'completed', finishedMs: 5000 })),
    )
    const { queue, onProgress } = setup(save)
    await queue.sendNow(snapshot('CAL', { status: 'completed' }))
    expect(save).toHaveBeenCalledTimes(1)
    expect((save.mock.calls[0]?.[1] as SaveProgressRequest).status).toBe('completed')
    expect(onProgress).toHaveBeenCalledWith(
      expect.objectContaining({ status: 'completed', finishedMs: 5000 }),
      expect.anything(),
    )
  })

  it('lê a fila local gravada antes (para reenviar na abertura)', async () => {
    const stored: SaveProgressRequest = {
      cells: cellsFrom(['CA.', '.#.', '...']),
      elapsedMs: 9000,
      status: 'in_progress',
      savedAt: '2026-10-14T12:30:00.000Z',
    }
    window.localStorage.setItem(key, JSON.stringify(stored))
    const save = vi.fn<SaveFn>(async () => ok())
    const { queue } = setup(save)
    expect(queue.readOutbox()).toEqual(stored)
    await queue.retry()
    expect(save).toHaveBeenCalledWith(PUZZLE_ID, stored, { keepalive: false })
    expect(window.localStorage.getItem(key)).toBeNull()
  })

  it('ignora fila local corrompida', () => {
    window.localStorage.setItem(key, '{não é json')
    const { queue } = setup(vi.fn<SaveFn>())
    expect(queue.readOutbox()).toBeNull()
    window.localStorage.setItem(key, JSON.stringify({ cells: 'x' }))
    expect(queue.readOutbox()).toBeNull()
  })

  it('segue funcionando sem armazenamento', async () => {
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('cheio')
    })
    const save = vi
      .fn<SaveFn>()
      .mockRejectedValueOnce(new ApiRequestError(0))
      .mockResolvedValue(ok())
    const { queue } = setup(save)
    queue.schedule(snapshot('C..'))
    await vi.advanceTimersByTimeAsync(2600)
    expect(queue.getState()).toBe('saved')
  })

  it('depois de dispose não agenda novas repetições, mas volta a funcionar quando usada', async () => {
    const save = vi.fn<SaveFn>().mockRejectedValue(new ApiRequestError(0))
    const { queue } = setup(save)
    const sending = queue.sendNow(snapshot('CA.'), { keepalive: true })
    queue.dispose() // como ao sair da tela com a rede caída
    await sending
    await vi.advanceTimersByTimeAsync(60_000)
    expect(save).toHaveBeenCalledTimes(1)
    expect(window.localStorage.getItem(key)).not.toBeNull() // fica para a próxima abertura
    save.mockResolvedValue(ok())
    queue.schedule(snapshot('CAL'))
    await vi.advanceTimersByTimeAsync(1500)
    expect(save).toHaveBeenCalledTimes(2)
    expect(queue.getState()).toBe('saved')
  })

  it('dispose cancela os envios pendentes', async () => {
    const save = vi.fn<SaveFn>(async () => ok())
    const { queue } = setup(save)
    queue.schedule(snapshot('C..'))
    queue.dispose()
    await vi.advanceTimersByTimeAsync(5000)
    expect(save).not.toHaveBeenCalled()
  })
})
