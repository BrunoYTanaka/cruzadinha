import { readFileSync } from 'node:fs'
import { describe, expect, it, vi } from 'vitest'
import { createResendSender } from './resend-sender'
import type { EmailMessage } from './types'

const message: EmailMessage = {
  to: 'ana@example.com',
  subject: 'Assunto',
  text: 'texto',
  html: '<p>texto</p>',
  idempotencyKey: 'signup-abc',
}

function fixture(name: string): string {
  return readFileSync(new URL(`./fixtures/${name}.json`, import.meta.url), 'utf8')
}

function senderReplying(status: number, body: string) {
  const fetcher = vi.fn(async () => new Response(body, { status }))
  return {
    fetcher,
    sender: createResendSender({
      apiKey: 're_chave-ficticia',
      from: 'Cruzadinha <nao-responda@example.com>',
      fetch: fetcher as unknown as typeof fetch,
    }),
  }
}

describe('createResendSender', () => {
  it('posts the message with the key, the sender and the idempotency key', async () => {
    const { sender, fetcher } = senderReplying(200, '{"id":"x"}')
    expect(await sender.send(message)).toEqual({ ok: true })

    const [url, init] = fetcher.mock.calls[0] as unknown as [string, RequestInit]
    expect(url).toBe('https://api.resend.com/emails')
    const headers = init.headers as Record<string, string>
    expect(headers.authorization).toBe('Bearer re_chave-ficticia')
    expect(headers['idempotency-key']).toBe('signup-abc')
    expect(JSON.parse(String(init.body))).toEqual({
      from: 'Cruzadinha <nao-responda@example.com>',
      to: ['ana@example.com'],
      subject: 'Assunto',
      html: '<p>texto</p>',
      text: 'texto',
    })
  })

  it.each([
    ['429-daily', 429, 'quota-daily'],
    ['429-monthly', 429, 'quota-monthly'],
    ['429-rate', 429, 'rate-limited'],
    ['422-validation', 422, 'failed'],
    ['500-internal', 500, 'failed'],
  ] as const)('maps %s to %s', async (name, status, reason) => {
    const { sender } = senderReplying(status, fixture(name))
    expect(await sender.send(message)).toEqual({ ok: false, reason })
  })

  it('does not take a 429 without a known name for a quota', async () => {
    const { sender } = senderReplying(429, '{"name":"outra_coisa"}')
    expect(await sender.send(message)).toEqual({ ok: false, reason: 'failed' })
  })

  it('fails on an unreadable body and on a network error', async () => {
    expect(await senderReplying(429, '<html>').sender.send(message)).toEqual({
      ok: false,
      reason: 'failed',
    })
    const sender = createResendSender({
      apiKey: 'k',
      from: 'a@b.com',
      fetch: (async () => {
        throw new Error('rede')
      }) as unknown as typeof fetch,
    })
    expect(await sender.send(message)).toEqual({ ok: false, reason: 'failed' })
  })
})
