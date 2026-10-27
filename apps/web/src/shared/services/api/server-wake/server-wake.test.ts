import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import {
  ServerWakeTimeoutError,
  WAKE_ATTEMPT_TIMEOUT_MS,
  WAKE_RETRY_MS,
  WAKE_TIMEOUT_MS,
  isServerReady,
  resetServerWake,
  waitForServer,
  whenServerReady,
} from './server-wake'

function json(status: number, body: unknown) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json' },
  })
}

const up = () => json(200, { status: 'ok', database: 'up' })
const down = () => json(200, { status: 'ok', database: 'down' })

beforeEach(() => {
  resetServerWake()
  vi.useFakeTimers()
})

afterEach(() => {
  vi.useRealTimers()
})

describe('waitForServer', () => {
  it('resolves on the first attempt when the API and the database are up', async () => {
    const fetch = vi.fn(async () => up())
    await waitForServer({ fetch })
    expect(fetch).toHaveBeenCalledTimes(1)
    expect(fetch).toHaveBeenCalledWith(
      '/api/health',
      expect.objectContaining({ credentials: 'same-origin' }),
    )
    expect(isServerReady()).toBe(true)
  })

  it('tries again 2 s later while the database is down', async () => {
    const fetch = vi.fn().mockResolvedValueOnce(down()).mockResolvedValueOnce(up())
    const done = waitForServer({ fetch })
    await vi.advanceTimersByTimeAsync(WAKE_RETRY_MS - 1)
    expect(fetch).toHaveBeenCalledTimes(1)
    await vi.advanceTimersByTimeAsync(1)
    await done
    expect(fetch).toHaveBeenCalledTimes(2)
  })

  it.each([
    [
      'an HTML page',
      () => new Response('<html></html>', { headers: { 'content-type': 'text/html' } }),
    ],
    ['a 503', () => json(503, { error: 'service-unavailable', message: 'x' })],
  ])('treats %s as not ready', async (_label, notReady) => {
    const fetch = vi.fn().mockResolvedValueOnce(notReady()).mockResolvedValueOnce(up())
    const done = waitForServer({ fetch })
    await vi.advanceTimersByTimeAsync(WAKE_RETRY_MS)
    await done
    expect(fetch).toHaveBeenCalledTimes(2)
  })

  it('treats a network failure as not ready', async () => {
    const fetch = vi
      .fn()
      .mockRejectedValueOnce(new TypeError('offline'))
      .mockResolvedValueOnce(up())
    const done = waitForServer({ fetch })
    await vi.advanceTimersByTimeAsync(WAKE_RETRY_MS)
    await done
    expect(fetch).toHaveBeenCalledTimes(2)
  })

  it('aborts an attempt that does not answer in 10 s', async () => {
    let firstSignal: AbortSignal | undefined
    const fetch = vi.fn((_url: RequestInfo | URL, init?: RequestInit) => {
      if (!firstSignal) {
        firstSignal = init?.signal ?? undefined
        return new Promise<Response>((_resolve, reject) =>
          init?.signal?.addEventListener('abort', () =>
            reject(new DOMException('x', 'AbortError')),
          ),
        )
      }
      return Promise.resolve(up())
    })
    const done = waitForServer({ fetch })
    await vi.advanceTimersByTimeAsync(WAKE_ATTEMPT_TIMEOUT_MS)
    expect(firstSignal?.aborted).toBe(true)
    await vi.advanceTimersByTimeAsync(WAKE_RETRY_MS)
    await done
    expect(fetch).toHaveBeenCalledTimes(2)
  })

  it('gives up after 90 s', async () => {
    const fetch = vi.fn(async () => down())
    const done = waitForServer({ fetch })
    const assertion = expect(done).rejects.toBeInstanceOf(ServerWakeTimeoutError)
    await vi.advanceTimersByTimeAsync(WAKE_TIMEOUT_MS)
    await assertion
    expect(isServerReady()).toBe(false)
  })

  it('does not call fetch again once ready', async () => {
    const fetch = vi.fn(async () => up())
    await waitForServer({ fetch })
    await waitForServer({ fetch })
    expect(fetch).toHaveBeenCalledTimes(1)
  })

  it('resetServerWake goes back to the initial state', async () => {
    await waitForServer({ fetch: vi.fn(async () => up()) })
    resetServerWake()
    expect(isServerReady()).toBe(false)
  })

  it('an external abort stops waiting without marking ready', async () => {
    const controller = new AbortController()
    const fetch = vi.fn(async () => down())
    const done = waitForServer({ fetch, signal: controller.signal })
    const assertion = expect(done).rejects.toMatchObject({ name: 'AbortError' })
    await vi.advanceTimersByTimeAsync(100)
    controller.abort()
    await vi.advanceTimersByTimeAsync(WAKE_RETRY_MS)
    await assertion
    expect(isServerReady()).toBe(false)
  })
})

describe('whenServerReady', () => {
  it('resolves at once when the server is already ready', async () => {
    await waitForServer({ fetch: vi.fn(async () => up()) })
    await expect(whenServerReady()).resolves.toBeUndefined()
  })

  it('stays pending until waitForServer marks the server ready', async () => {
    const fetch = vi.fn().mockResolvedValueOnce(down()).mockResolvedValueOnce(up())
    let resolved = false
    const waiting = whenServerReady().then(() => {
      resolved = true
    })
    const wake = waitForServer({ fetch })
    await vi.advanceTimersByTimeAsync(WAKE_RETRY_MS - 1)
    expect(resolved).toBe(false)
    await vi.advanceTimersByTimeAsync(1)
    await wake
    await waiting
    expect(resolved).toBe(true)
  })

  it('rejects with AbortError when the signal aborts, and ignores a later wake-up', async () => {
    const controller = new AbortController()
    const waiting = whenServerReady(controller.signal)
    controller.abort()
    await expect(waiting).rejects.toMatchObject({ name: 'AbortError' })
    await waitForServer({ fetch: vi.fn(async () => up()) })
    expect(isServerReady()).toBe(true)
  })

  it('rejects without waiting when the signal is already aborted', async () => {
    const controller = new AbortController()
    controller.abort()
    await expect(whenServerReady(controller.signal)).rejects.toMatchObject({ name: 'AbortError' })
  })
})

describe('without a network', () => {
  const setOnline = (value: boolean) =>
    Object.defineProperty(navigator, 'onLine', { value, configurable: true })
  afterEach(() => setOnline(true))

  it('waitForServer returns without marking the server ready', async () => {
    setOnline(false)
    const fetch = vi.fn(async () => up())
    await waitForServer({ fetch })
    expect(fetch).not.toHaveBeenCalled()
    expect(isServerReady()).toBe(false)
  })

  it('waitForServer gives up when the network drops during the wait', async () => {
    const fetch = vi.fn(async () => down())
    const done = waitForServer({ fetch })
    await vi.advanceTimersByTimeAsync(0)
    setOnline(false)
    await vi.advanceTimersByTimeAsync(WAKE_RETRY_MS)
    await done
    expect(isServerReady()).toBe(false)
  })

  it('whenServerReady resolves offline, also when it goes offline while waiting', async () => {
    setOnline(false)
    await whenServerReady()
    setOnline(true)
    const waiting = whenServerReady()
    setOnline(false)
    window.dispatchEvent(new Event('offline'))
    await waiting
  })

  it('the online event restarts the wait and marks the server ready', async () => {
    setOnline(false)
    await waitForServer()
    const fetch = vi.fn(async () => up())
    vi.stubGlobal('fetch', fetch)
    setOnline(true)
    window.dispatchEvent(new Event('online'))
    await vi.advanceTimersByTimeAsync(0)
    expect(isServerReady()).toBe(true)
    vi.unstubAllGlobals()
  })
})
