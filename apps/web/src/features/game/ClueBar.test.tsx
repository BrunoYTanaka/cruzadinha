import type { Word } from '@cruzadinha/shared'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { expectNoA11yViolations } from '../../test/axe'
import { ClueBar } from './ClueBar'

const word: Word = {
  number: 1,
  direction: 'across',
  row: 0,
  col: 0,
  length: 3,
  clue: 'Astro do dia',
}

describe('ClueBar', () => {
  it('com anterior e próxima, mostra os dois botões e chama cada um', async () => {
    const user = userEvent.setup()
    const onPrevious = vi.fn()
    const onNext = vi.fn()
    const { container } = render(<ClueBar word={word} onPrevious={onPrevious} onNext={onNext} />)
    await user.click(screen.getByRole('button', { name: 'Dica anterior' }))
    await user.click(screen.getByRole('button', { name: 'Próxima dica' }))
    expect(onPrevious).toHaveBeenCalledTimes(1)
    expect(onNext).toHaveBeenCalledTimes(1)
    await expectNoA11yViolations(container)
  })

  it('sem as props, não tem botões', () => {
    render(<ClueBar word={word} />)
    expect(screen.queryByRole('button')).not.toBeInTheDocument()
  })

  it('continua anunciando a dica ativa', () => {
    render(<ClueBar word={word} onPrevious={() => {}} onNext={() => {}} />)
    const live = screen.getByText('Astro do dia').closest('[aria-live]')
    expect(live).toHaveAttribute('aria-live', 'polite')
  })

  // Feature 017: a barra corta a dica longa com reticências só no CSS; o leitor de tela ouve tudo.
  const longWord: Word = {
    ...word,
    number: 12,
    clue:
      'Dica inventada e comprida de propósito, que fala de um barco de papel atravessando um lago ' +
      'inteiro numa tarde de vento, passando por patos, juncos e pontes de madeira até a outra margem',
  }

  it.each([
    ['com anterior e próxima', { onPrevious: () => {}, onNext: () => {} }],
    ['sem anterior e próxima', {}],
  ])('%s, a região viva tem a dica longa inteira, sem reticências', (_, props) => {
    const { container } = render(<ClueBar word={longWord} {...props} />)
    const live = container.querySelector('[aria-live]')
    expect(live?.textContent).toBe(`12 Horizontal${longWord.clue}`)
    expect(live?.textContent).not.toContain('…')
  })
})
