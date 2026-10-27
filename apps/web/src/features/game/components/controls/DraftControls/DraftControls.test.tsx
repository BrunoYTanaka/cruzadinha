import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { expectNoA11yViolations } from '../../../../../test/axe'
import { DraftControls } from './DraftControls'

function setup(props: Partial<Parameters<typeof DraftControls>[0]> = {}) {
  const handlers = { onPencil: vi.fn(), onConfirm: vi.fn(), onDiscard: vi.fn() }
  const view = render(<DraftControls pencil={false} hasDraft {...handlers} {...props} />)
  return { ...handlers, ...view }
}

const pencil = () => screen.getByRole('button', { name: 'Lápis (rascunho)' })
const confirm = () => screen.getByRole('button', { name: 'Confirmar rascunho' })
const discard = () => screen.getByRole('button', { name: 'Descartar rascunho' })

describe('DraftControls', () => {
  it('o lápis alterna e expõe aria-pressed', async () => {
    const { onPencil, rerender } = setup()
    expect(pencil()).toHaveAttribute('aria-pressed', 'false')
    await userEvent.click(pencil())
    expect(onPencil).toHaveBeenCalledWith(true)
    rerender(
      <DraftControls pencil hasDraft onPencil={onPencil} onConfirm={vi.fn()} onDiscard={vi.fn()} />,
    )
    expect(pencil()).toHaveAttribute('aria-pressed', 'true')
  })

  it('confirmar e descartar agem e anunciam', async () => {
    const { onConfirm, onDiscard } = setup()
    await userEvent.click(confirm())
    expect(onConfirm).toHaveBeenCalled()
    expect(screen.getByRole('status')).toHaveTextContent('Rascunho confirmado')
    await userEvent.click(discard())
    expect(onDiscard).toHaveBeenCalled()
    expect(screen.getByRole('status')).toHaveTextContent('Rascunho descartado')
  })

  it('sem rascunho na palavra, confirmar e descartar ficam aria-disabled e não agem', async () => {
    const { onConfirm, onDiscard } = setup({ hasDraft: false })
    for (const button of [confirm(), discard()]) expect(button).toHaveAttribute('aria-disabled')
    await userEvent.click(confirm())
    await userEvent.click(discard())
    expect(onConfirm).not.toHaveBeenCalled()
    expect(onDiscard).not.toHaveBeenCalled()
  })

  it('pausado ou com configurações abertas bloqueia os três', async () => {
    const { onPencil, onConfirm, onDiscard } = setup({ disabled: true })
    for (const button of [pencil(), confirm(), discard()]) {
      expect(button).toHaveAttribute('aria-disabled', 'true')
      await userEvent.click(button)
    }
    expect(onPencil).not.toHaveBeenCalled()
    expect(onConfirm).not.toHaveBeenCalled()
    expect(onDiscard).not.toHaveBeenCalled()
  })

  it('não tem violações de acessibilidade', async () => {
    const { container } = setup({ pencil: true })
    await expectNoA11yViolations(container)
  })
})
