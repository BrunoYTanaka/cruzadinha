import { act, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, describe, expect, it, vi } from 'vitest'
import type { registerSW } from 'virtual:pwa-register'
import { expectNoA11yViolations } from '../../../../test/axe'
import { installAppUpdate } from '../../hooks/useAppUpdate/useAppUpdate'
import { UpdateNotice } from './UpdateNotice'

type Options = NonNullable<Parameters<typeof registerSW>[0]>

let cleanup = () => {}
function install() {
  let options: Options = {}
  const reload = vi.fn()
  const register = ((o?: Options) => {
    options = o ?? {}
    return () => Promise.resolve()
  }) as unknown as typeof registerSW
  cleanup = installAppUpdate(register, {
    location: { reload },
    setTimeout: (handler, ms) => globalThis.setTimeout(handler, ms) as unknown as number,
    clearTimeout: (id) => globalThis.clearTimeout(id),
    document: Object.assign(new EventTarget(), { visibilityState: 'visible' as const }),
    navigator: { onLine: true },
  })
  return { refresh: () => act(() => options.onNeedRefresh?.()), reload }
}

afterEach(() => cleanup())

describe('UpdateNotice', () => {
  it('não renderiza nada sem versão esperando', () => {
    install()
    const { container } = render(<UpdateNotice />)
    expect(container).toBeEmptyDOMElement()
  })

  it('mostra o aviso, vira "Atualizando…" ao clicar e perde o Fechar', async () => {
    const { refresh } = install()
    const user = userEvent.setup()
    const { container } = render(<UpdateNotice />)
    refresh()
    expect(screen.getByRole('status')).toHaveTextContent('Saiu uma versão nova do Cruzadinha.')
    expect(screen.getByRole('button', { name: 'Fechar' })).toBeInTheDocument()
    await expectNoA11yViolations(container)
    await user.click(screen.getByRole('button', { name: 'Atualizar' }))
    const busy = screen.getByRole('button', { name: 'Atualizando…' })
    expect(busy).toBeDisabled()
    expect(busy).toHaveAttribute('aria-busy', 'true')
    expect(screen.queryByRole('button', { name: 'Fechar' })).toBeNull()
  })

  it('não rouba o foco ao aparecer', () => {
    const { refresh } = install()
    render(
      <>
        <button>Fora</button>
        <UpdateNotice />
      </>,
    )
    const outside = screen.getByRole('button', { name: 'Fora' })
    outside.focus()
    refresh()
    expect(screen.getByRole('status')).toBeInTheDocument()
    expect(document.activeElement).toBe(outside)
  })

  it('Fechar esconde sem recarregar e continua escondido ao montar de novo', async () => {
    const { refresh, reload } = install()
    const user = userEvent.setup()
    const { unmount } = render(<UpdateNotice />)
    refresh()
    await user.click(screen.getByRole('button', { name: 'Fechar' }))
    expect(screen.queryByRole('status')).toBeNull()
    expect(reload).not.toHaveBeenCalled()
    unmount()
    render(<UpdateNotice />)
    expect(screen.queryByRole('status')).toBeNull()
  })
})
