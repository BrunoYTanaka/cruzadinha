import { act, render, screen } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { expectNoA11yViolations } from '../../../test/axe'
import { installFakeTurnstile } from '../../../test/turnstile'
import { Turnstile } from './Turnstile'

let fake: ReturnType<typeof installFakeTurnstile>

beforeEach(() => {
  fake = installFakeTurnstile()
})
afterEach(() => {
  fake.uninstall()
  document.documentElement.removeAttribute('data-theme')
  document.head.querySelectorAll('script').forEach((script) => script.remove())
  vi.useRealTimers()
})

function setup(overrides: Partial<Parameters<typeof Turnstile>[0]> = {}) {
  const onToken = vi.fn()
  const onUnavailable = vi.fn()
  const view = render(
    <Turnstile
      siteKey="chave-publica"
      action="signup"
      onToken={onToken}
      onUnavailable={onUnavailable}
      {...overrides}
    />,
  )
  return { onToken, onUnavailable, ...view }
}

describe('Turnstile', () => {
  it('renderiza invisível, em português, com a ação e o tema do site', async () => {
    document.documentElement.setAttribute('data-theme', 'dark')
    setup({ action: 'resend' })
    await vi.waitFor(() => expect(fake.api.render).toHaveBeenCalledTimes(1))
    expect(fake.last()).toMatchObject({
      sitekey: 'chave-publica',
      action: 'resend',
      appearance: 'interaction-only',
      language: 'pt-br',
      theme: 'dark',
    })
  })

  it('entrega a prova, e null quando vence, dá erro ou estoura o tempo', async () => {
    const { onToken, onUnavailable } = setup()
    await vi.waitFor(() => expect(fake.api.render).toHaveBeenCalled())
    onToken.mockClear()

    fake.solve('prova-1')
    expect(onToken).toHaveBeenLastCalledWith('prova-1')
    fake.expire()
    expect(onToken).toHaveBeenLastCalledWith(null)
    act(() => fake.last()?.['timeout-callback']())
    expect(onToken).toHaveBeenLastCalledWith(null)
    fake.fail()
    expect(onToken).toHaveBeenLastCalledWith(null)
    expect(onUnavailable).toHaveBeenCalledTimes(1)
  })

  it('chama turnstile.reset com o widget quando o sinal de reset aumenta', async () => {
    const { rerender } = setup({ resetSignal: 0 })
    await vi.waitFor(() => expect(fake.api.render).toHaveBeenCalled())
    expect(fake.api.reset).not.toHaveBeenCalled()
    rerender(
      <Turnstile
        siteKey="chave-publica"
        action="signup"
        onToken={vi.fn()}
        onUnavailable={vi.fn()}
        resetSignal={1}
      />,
    )
    expect(fake.api.reset).toHaveBeenCalledWith('widget-1')
    expect(fake.api.render).toHaveBeenCalledTimes(1)
  })

  it('acompanha a troca de tema: remove o widget e o renderiza de novo', async () => {
    document.documentElement.setAttribute('data-theme', 'light')
    const { onToken } = setup()
    await vi.waitFor(() => expect(fake.api.render).toHaveBeenCalledTimes(1))
    onToken.mockClear()

    document.documentElement.setAttribute('data-theme', 'dark')
    await vi.waitFor(() => expect(fake.api.render).toHaveBeenCalledTimes(2))
    expect(fake.api.remove).toHaveBeenCalledWith('widget-1')
    expect(fake.last()?.theme).toBe('dark')
    expect(onToken).toHaveBeenCalledWith(null)
  })

  it('remove o widget ao sair da tela', async () => {
    const { unmount } = setup()
    await vi.waitFor(() => expect(fake.api.render).toHaveBeenCalled())
    unmount()
    expect(fake.api.remove).toHaveBeenCalledWith('widget-1')
  })

  it('pede o script uma vez quando ainda não existe e avisa se ele falha', async () => {
    fake.uninstall()
    const { onUnavailable } = setup()
    const scripts = document.head.querySelectorAll('script[src*="challenges.cloudflare.com"]')
    expect(scripts).toHaveLength(1)
    expect(scripts[0]?.getAttribute('src')).toContain('render=explicit')
    act(() => scripts[0]?.dispatchEvent(new Event('error')))
    await vi.waitFor(() => expect(onUnavailable).toHaveBeenCalledTimes(1))
    expect(document.head.querySelectorAll('script[src*="challenges"]')).toHaveLength(0)
  })

  it('avisa se o script não chega em 10 s', async () => {
    vi.useFakeTimers()
    fake.uninstall()
    const { onUnavailable } = setup()
    await act(async () => {
      await vi.advanceTimersByTimeAsync(10_000)
    })
    expect(onUnavailable).toHaveBeenCalledTimes(1)
  })

  it('não tem violações de acessibilidade nos dois temas', async () => {
    for (const theme of ['light', 'dark']) {
      document.documentElement.setAttribute('data-theme', theme)
      const { container, unmount } = setup()
      await vi.waitFor(() => expect(fake.api.render).toHaveBeenCalled())
      await expectNoA11yViolations(container)
      unmount()
    }
    expect(screen.queryByRole('alert')).not.toBeInTheDocument()
  })
})
