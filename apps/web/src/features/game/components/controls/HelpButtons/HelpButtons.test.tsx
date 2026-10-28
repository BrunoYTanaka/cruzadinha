import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { expectNoA11yViolations } from '../../../../../test/axe'
import { HelpButtons } from './HelpButtons'
import { LegendButton } from '../LegendButton/LegendButton'

const limits = { letters: 4, words: 2 }

function setup(props: Partial<Parameters<typeof HelpButtons>[0]> = {}) {
  const handlers = { onLetter: vi.fn(), onWord: vi.fn() }
  const view = render(
    <HelpButtons
      usage={{ letters: 1, words: 0 }}
      limits={limits}
      lastHelp={null}
      {...handlers}
      {...props}
    />,
  )
  return { ...handlers, ...view }
}

describe('HelpButtons', () => {
  it('mostra os contadores "1/4 Letra" e e "0/2 Palavra", sem o botão Verificar (está no menu Ajudas)', () => {
    setup()
    expect(screen.getByText('1/4 Letra')).toBeInTheDocument()
    expect(screen.getByText('0/2 Palavra')).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Verificar' })).not.toBeInTheDocument()
  })

  it('chama cada ajuda', async () => {
    const user = userEvent.setup()
    const { onLetter, onWord } = setup()
    await user.click(screen.getByRole('button', { name: /Revelar letra/ }))
    await user.click(screen.getByRole('button', { name: /Revelar palavra/ }))
    expect(onLetter).toHaveBeenCalledOnce()
    expect(onWord).toHaveBeenCalledOnce()
  })

  it('esgotada fica aria-disabled, diz o motivo e não age', async () => {
    const user = userEvent.setup()
    const { onLetter } = setup({ usage: { letters: 4, words: 0 } })
    const button = screen.getByRole('button', { name: 'Revelar letra: limite de 4 atingido' })
    expect(button).toHaveAttribute('aria-disabled', 'true')
    await user.click(button)
    expect(onLetter).not.toHaveBeenCalled()
  })

  it('sem limite mostra ∞, diz no nome e nunca esgota (feature 021)', async () => {
    const user = userEvent.setup()
    const { onLetter } = setup({
      usage: { letters: 50, words: 3 },
      limits: { letters: null, words: null },
    })
    expect(screen.getByText('50/∞ Letra')).toBeInTheDocument()
    expect(screen.getByText('3/∞ Palavra')).toBeInTheDocument()
    const button = screen.getByRole('button', { name: 'Revelar letra: sem limite, 50 usadas' })
    expect(button).not.toHaveAttribute('aria-disabled')
    expect(
      screen.getByRole('button', { name: 'Revelar palavra: sem limite, 3 usadas' }),
    ).not.toHaveAttribute('aria-disabled')
    await user.click(button)
    expect(onLetter).toHaveBeenCalledOnce()
  })

  it('anuncia o resultado em uma região aria-live', () => {
    setup({ lastHelp: { seq: 1, kind: 'verify', count: 2 } })
    expect(screen.getByRole('status')).toHaveTextContent('Verificado: 2 letras erradas')
  })

  it('anuncia o limite atingido', () => {
    setup({ lastHelp: { seq: 3, kind: 'letter-limit', count: 0 } })
    expect(screen.getByRole('status')).toHaveTextContent('Limite de letras atingido')
  })

  it('não tem violações de acessibilidade', async () => {
    const { container } = setup()
    await expectNoA11yViolations(container)
  })
})

describe('LegendButton', () => {
  it('começa escondida e o botão "?" abre e fecha', async () => {
    const user = userEvent.setup()
    render(<LegendButton />)
    const button = screen.getByRole('button', { name: 'Legenda do tabuleiro' })
    expect(button).toHaveAttribute('aria-expanded', 'false')
    expect(screen.queryByText('Selecionada')).not.toBeInTheDocument()
    await user.click(button)
    expect(button).toHaveAttribute('aria-expanded', 'true')
    expect(screen.getByText('Errada na verificação')).toBeInTheDocument()
    await user.click(button)
    expect(screen.queryByText('Selecionada')).not.toBeInTheDocument()
  })

  it('Esc fecha', async () => {
    const user = userEvent.setup()
    render(<LegendButton />)
    await user.click(screen.getByRole('button', { name: 'Legenda do tabuleiro' }))
    await user.keyboard('{Escape}')
    expect(screen.queryByText('Selecionada')).not.toBeInTheDocument()
  })

  it('tocar fora fecha', async () => {
    const user = userEvent.setup()
    render(
      <div>
        <LegendButton />
        <p>fora</p>
      </div>,
    )
    await user.click(screen.getByRole('button', { name: 'Legenda do tabuleiro' }))
    await user.click(screen.getByText('fora'))
    expect(screen.queryByText('Selecionada')).not.toBeInTheDocument()
  })
})
