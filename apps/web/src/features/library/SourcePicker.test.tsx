import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { expectNoA11yViolations } from '../../test/axe'
import { SourcePicker } from './SourcePicker'

describe('SourcePicker', () => {
  it('mostra as duas fontes num grupo, com a ativa marcada', () => {
    render(<SourcePicker value="oglobo" onChange={() => {}} />)
    const group = screen.getByRole('group', { name: 'Fonte da cruzada' })
    expect(group).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'O Globo' })).toHaveAttribute('aria-pressed', 'true')
    expect(screen.getByRole('button', { name: 'Cruzada Online' })).toHaveAttribute(
      'aria-pressed',
      'false',
    )
  })

  it('avisa a troca pelo clique e pelo teclado', async () => {
    const onChange = vi.fn()
    const user = userEvent.setup()
    render(<SourcePicker value="oglobo" onChange={onChange} />)

    await user.click(screen.getByRole('button', { name: 'Cruzada Online' }))
    expect(onChange).toHaveBeenLastCalledWith('cruzadaonline')

    screen.getByRole('button', { name: 'O Globo' }).focus()
    await user.keyboard('{Enter}')
    expect(onChange).toHaveBeenLastCalledWith('oglobo')
  })

  it('não tem violações de acessibilidade', async () => {
    const { container } = render(<SourcePicker value="cruzadaonline" onChange={() => {}} />)
    await expectNoA11yViolations(container)
  })
})
