import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { useState } from 'react'
import { describe, expect, it, vi } from 'vitest'
import { expectNoA11yViolations } from '../../test/axe'
import { LAYOUT5, makePuzzle } from '../../test/fixtures'
import { ClueSheet } from './ClueSheet'

const puzzle = makePuzzle(LAYOUT5)

function Harness({ onSelect = () => {} }: { onSelect?: (number: number) => void }) {
  const [open, setOpen] = useState(false)
  const active =
    puzzle.words.find((word) => word.number === 6 && word.direction === 'across') ?? null
  return (
    <div id="root">
      <button onClick={() => setOpen(true)}>Dicas</button>
      <ClueSheet
        open={open}
        onClose={() => setOpen(false)}
        puzzle={puzzle}
        activeWord={active}
        struck={new Set(['1across'])}
        onSelect={(word) => onSelect(word.number)}
      />
    </div>
  )
}

describe('ClueSheet', () => {
  it('a tecla "Dicas" abre a lista com horizontais e verticais', async () => {
    const user = userEvent.setup()
    render(<Harness />)
    await user.click(screen.getByRole('button', { name: 'Dicas' }))
    const dialog = screen.getByRole('dialog', { name: 'Dicas' })
    const across = within(dialog).getByRole('region', { name: 'Horizontais' })
    const down = within(dialog).getByRole('region', { name: 'Verticais' })
    expect(within(across).getAllByRole('button')).toHaveLength(7)
    expect(within(down).getAllByRole('button')).toHaveLength(4)
    await expectNoA11yViolations(document.body)
  })

  it('destaca a dica ativa e marca as resolvidas', async () => {
    const user = userEvent.setup()
    render(<Harness />)
    await user.click(screen.getByRole('button', { name: 'Dicas' }))
    const dialog = screen.getByRole('dialog', { name: 'Dicas' })
    expect(within(dialog).getByRole('button', { name: /Dica 6 horizontal/ })).toHaveAttribute(
      'aria-current',
      'true',
    )
    expect(
      within(dialog).getByRole('button', { name: /Dica 1 horizontal.*resolvida/ }),
    ).toBeInTheDocument()
  })

  it('escolher uma dica seleciona a palavra e fecha a folha', async () => {
    const user = userEvent.setup()
    const onSelect = vi.fn()
    render(<Harness onSelect={onSelect} />)
    await user.click(screen.getByRole('button', { name: 'Dicas' }))
    await user.click(screen.getByRole('button', { name: /Dica 2 vertical/ }))
    expect(onSelect).toHaveBeenCalledWith(2)
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  })

  it('Esc fecha e o foco volta à tecla', async () => {
    const user = userEvent.setup()
    render(<Harness />)
    const key = screen.getByRole('button', { name: 'Dicas' })
    await user.click(key)
    await user.keyboard('{Escape}')
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    expect(key).toHaveFocus()
  })

  it('"Fechar" também fecha', async () => {
    const user = userEvent.setup()
    render(<Harness />)
    await user.click(screen.getByRole('button', { name: 'Dicas' }))
    await user.click(screen.getByRole('button', { name: 'Fechar' }))
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  })
})
