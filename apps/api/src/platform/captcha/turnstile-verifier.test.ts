import { describe, expect, it, vi } from 'vitest'
import { createTurnstileVerifier } from './turnstile-verifier'

const input = { token: 'prova-ficticia', action: 'signup', remoteIp: '203.0.113.7' } as const

function verifierReplying(reply: () => Promise<Response> | Response) {
  const fetcher = vi.fn(async () => reply())
  return {
    fetcher,
    verifier: createTurnstileVerifier({
      secret: 'segredo-ficticio',
      hostname: 'cruzadinha.example.com',
      fetch: fetcher as unknown as typeof fetch,
    }),
  }
}

const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status })
const good = { success: true, hostname: 'cruzadinha.example.com', action: 'signup' }

describe('createTurnstileVerifier', () => {
  it('accepts a proof for the right action and host', async () => {
    const { verifier } = verifierReplying(() => json(good))
    expect(await verifier.verify(input)).toEqual({ ok: true })
  })

  it('sends the secret, the proof and the address to siteverify, with no idempotency key', async () => {
    const { verifier, fetcher } = verifierReplying(() => json(good))
    await verifier.verify(input)
    const [url, init] = fetcher.mock.calls[0] as unknown as [string, RequestInit]
    expect(url).toBe('https://challenges.cloudflare.com/turnstile/v0/siteverify')
    expect(init.method).toBe('POST')
    expect(JSON.parse(String(init.body))).toEqual({
      secret: 'segredo-ficticio',
      response: 'prova-ficticia',
      remoteip: '203.0.113.7',
    })
    expect(init.signal).toBeInstanceOf(AbortSignal)
  })

  it('leaves the address out when it is an IPv6 block and not an address', async () => {
    const { verifier, fetcher } = verifierReplying(() => json(good))
    await verifier.verify({ ...input, remoteIp: '2001:db8:1:2::/64' })
    const [, init] = fetcher.mock.calls[0] as unknown as [string, RequestInit]
    expect(JSON.parse(String(init.body))).not.toHaveProperty('remoteip')
  })

  it('rejects when siteverify says the proof failed', async () => {
    const { verifier } = verifierReplying(() =>
      json({ success: false, 'error-codes': ['timeout-or-duplicate'] }),
    )
    expect(await verifier.verify(input)).toEqual({ ok: false, reason: 'rejected' })
  })

  it('rejects a proof issued for another action', async () => {
    const { verifier } = verifierReplying(() => json({ ...good, action: 'forgot' }))
    expect(await verifier.verify(input)).toEqual({ ok: false, reason: 'wrong-action' })
  })

  it('rejects a proof that has no action', async () => {
    const { verifier } = verifierReplying(() => json({ success: true, hostname: good.hostname }))
    expect(await verifier.verify(input)).toEqual({ ok: false, reason: 'wrong-action' })
  })

  it('rejects a proof issued for another site', async () => {
    const { verifier } = verifierReplying(() => json({ ...good, hostname: 'outro.example.com' }))
    expect(await verifier.verify(input)).toEqual({ ok: false, reason: 'wrong-hostname' })
  })

  it.each([
    ['a 5xx status', () => json(good, 500)],
    ['a body that is not JSON', () => new Response('<html>', { status: 200 })],
    ['a body of the wrong shape', () => json({ ok: true })],
    ['a network error', () => Promise.reject(new TypeError('fetch failed'))],
    ['a timeout', () => Promise.reject(new DOMException('timeout', 'TimeoutError'))],
  ])('refuses on %s (fail-closed)', async (_name, reply) => {
    const { verifier } = verifierReplying(reply)
    expect(await verifier.verify(input)).toEqual({ ok: false, reason: 'unavailable' })
  })
})
