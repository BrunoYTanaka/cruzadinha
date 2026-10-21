import { fireEvent, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { expectNoA11yViolations } from '../test/axe'
import { Tooltip } from './Tooltip'

function setup() {
  return render(
    <Tooltip label="Configurações">
      <button type="button" aria-label="Configurações">
        ⚙
      </button>
    </Tooltip>,
  )
}

const tip = () => screen.queryByText('Configurações', { selector: '[data-tooltip]' })

describe('Tooltip', () => {
  it('aparece no foco do alvo e some ao sair', async () => {
    const user = userEvent.setup()
    setup()
    expect(tip()).toBeNull()
    await user.tab()
    expect(tip()).toBeInTheDocument()
    await user.tab()
    expect(tip()).toBeNull()
  })

  it('aparece com o mouse e some ao sair', () => {
    setup()
    const target = screen.getByRole('button')
    fireEvent.pointerEnter(target.parentElement!, { pointerType: 'mouse' })
    expect(tip()).toBeInTheDocument()
    fireEvent.pointerLeave(target.parentElement!, { pointerType: 'mouse' })
    expect(tip()).toBeNull()
  })

  it('não aparece com toque', () => {
    setup()
    fireEvent.pointerEnter(screen.getByRole('button').parentElement!, { pointerType: 'touch' })
    expect(tip()).toBeNull()
  })

  it('Esc fecha sem impedir que o evento chegue ao documento', async () => {
    const user = userEvent.setup()
    const onDocumentKey = vi.fn()
    document.addEventListener('keydown', onDocumentKey)
    setup()
    await user.tab()
    expect(tip()).toBeInTheDocument()
    await user.keyboard('{Escape}')
    expect(tip()).toBeNull()
    expect(onDocumentKey).toHaveBeenCalled()
    document.removeEventListener('keydown', onDocumentKey)
  })

  it('é escondido do leitor de tela (o nome já está no alvo)', async () => {
    const user = userEvent.setup()
    const { container } = setup()
    await user.tab()
    expect(tip()).toHaveAttribute('aria-hidden', 'true')
    expect(screen.getAllByRole('button', { name: 'Configurações' })).toHaveLength(1)
    await expectNoA11yViolations(container)
  })
})
