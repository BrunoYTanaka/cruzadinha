import type { FastifyRequest } from 'fastify'
import { describe, expect, it, vi } from 'vitest'
import { createCaptchaGuard } from './captcha-guard'
import type { CaptchaResult, CaptchaVerifier } from './types'

function setup(
  enabled: boolean,
  result: CaptchaResult = { ok: true },
  limits: { maxInFlight?: number; maxInFlightPerAddress?: number } = {},
) {
  const verify = vi.fn<CaptchaVerifier['verify']>(async () => result)
  const warn = vi.fn()
  const debug = vi.fn()
  const guard = createCaptchaGuard({ enabled, verifier: { verify }, ...limits })
  const request = (body: unknown, clientAddress = '203.0.113.7') =>
    ({ body, clientAddress, log: { warn, debug } }) as unknown as FastifyRequest
  return { guard, verify, warn, debug, request }
}

describe('createCaptchaGuard', () => {
  it('lets everything through and calls nothing when disabled', async () => {
    const { guard, verify, request } = setup(false)
    expect(await guard.check(request(undefined), 'signup')).toBe(true)
    expect(await guard.check(request({ captchaToken: 'x' }), 'signup')).toBe(true)
    expect(verify).not.toHaveBeenCalled()
  })

  it.each([
    ['no body', undefined],
    ['a body that is not an object', 'texto'],
    ['no token', { email: 'a@b.co' }],
    ['an empty token', { captchaToken: '' }],
    ['a non-string token', { captchaToken: 42 }],
    ['a 2049-character token', { captchaToken: 'a'.repeat(2049) }],
  ])('refuses %s without calling the verifier', async (_name, body) => {
    const { guard, verify, request } = setup(true)
    expect(await guard.check(request(body), 'signup')).toBe(false)
    expect(verify).not.toHaveBeenCalled()
  })

  it('passes the token, the action and the client address to the verifier', async () => {
    const { guard, verify, request } = setup(true)
    expect(await guard.check(request({ captchaToken: 'prova' }), 'resend')).toBe(true)
    expect(verify).toHaveBeenCalledWith({
      token: 'prova',
      action: 'resend',
      remoteIp: '203.0.113.7',
    })
  })

  it('refuses when the verifier refuses and logs only the reason', async () => {
    const { guard, warn, request } = setup(true, { ok: false, reason: 'wrong-action' })
    expect(await guard.check(request({ captchaToken: 'prova-secreta' }), 'forgot')).toBe(false)
    expect(warn).toHaveBeenCalledWith({ reason: 'wrong-action' }, 'captcha recusado')
    expect(JSON.stringify(warn.mock.calls)).not.toContain('prova-secreta')
  })

  it('logs a missing token at debug level, not warn', async () => {
    const { guard, warn, debug, request } = setup(true)
    await guard.check(request({}), 'signup')
    expect(warn).not.toHaveBeenCalled()
    expect(debug).toHaveBeenCalledWith({ reason: 'missing' }, 'captcha recusado')
  })

  describe('teto de verificações em andamento', () => {
    // Verificador que só responde quando o teste manda.
    function held(limits: { maxInFlight?: number; maxInFlightPerAddress?: number }) {
      const releases: (() => void)[] = []
      const verify = vi.fn<CaptchaVerifier['verify']>(
        () => new Promise((resolve) => releases.push(() => resolve({ ok: true }))),
      )
      const debug = vi.fn()
      const guard = createCaptchaGuard({ enabled: true, verifier: { verify }, ...limits })
      const request = (address: string) =>
        ({
          body: { captchaToken: 'prova' },
          clientAddress: address,
          log: { warn: vi.fn(), debug },
        }) as unknown as FastifyRequest
      return { guard, verify, debug, releases, request }
    }

    it('recusa acima do teto por endereço sem chamar o verificador, e libera ao terminar', async () => {
      const { guard, verify, releases, request } = held({ maxInFlightPerAddress: 2 })
      const first = guard.check(request('a'), 'signup')
      const second = guard.check(request('a'), 'signup')
      expect(await guard.check(request('a'), 'signup')).toBe(false)
      expect(verify).toHaveBeenCalledTimes(2)

      // Outro endereço não é afetado.
      const other = guard.check(request('b'), 'signup')
      releases.forEach((release) => release())
      expect(await Promise.all([first, second, other])).toEqual([true, true, true])

      const again = guard.check(request('a'), 'signup')
      releases.at(-1)?.()
      expect(await again).toBe(true)
    })

    it('com 50 pedidos simultâneos de um endereço, só 2 chegam ao verificador (SC-009)', async () => {
      const { guard, verify, releases, request } = held({})
      const all = Array.from({ length: 50 }, () => guard.check(request('a'), 'signup'))
      expect(verify).toHaveBeenCalledTimes(2)
      releases.forEach((release) => release())
      const results = await Promise.all(all)
      expect(results.filter(Boolean)).toHaveLength(2)
    })

    it('recusa acima do teto total e libera mesmo quando o verificador falha', async () => {
      const verify = vi
        .fn<CaptchaVerifier['verify']>()
        .mockRejectedValueOnce(new Error('rede'))
        .mockResolvedValue({ ok: true })
      const guard = createCaptchaGuard({
        enabled: true,
        verifier: { verify },
        maxInFlight: 1,
        maxInFlightPerAddress: 1,
      })
      const request = {
        body: { captchaToken: 'prova' },
        clientAddress: 'a',
        log: { warn: vi.fn(), debug: vi.fn() },
      } as unknown as FastifyRequest
      await expect(guard.check(request, 'signup')).rejects.toThrow('rede')
      expect(await guard.check(request, 'signup')).toBe(true)
    })
  })
})
