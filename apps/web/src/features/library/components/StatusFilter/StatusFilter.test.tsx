import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { expectNoA11yViolations } from '../../../../test/axe'
import { StatusFilter } from './StatusFilter'

describe('StatusFilter (feature 053)', () => {
  it('marca só o filtro escolhido e avisa a troca', async () => {
    const user = userEvent.setup()
    const onChange = vi.fn()
    render(<StatusFilter value="all" onChange={onChange} />)
    expect(screen.getByRole('button', { name: 'Todas' })).toHaveAttribute('aria-pressed', 'true')
    expect(screen.getByRole('button', { name: 'Concluídas' })).toHaveAttribute(
      'aria-pressed',
      'false',
    )
    await user.click(screen.getByRole('button', { name: 'Concluídas' }))
    expect(onChange).toHaveBeenCalledWith('completed')
  })

  it('funciona só com o teclado', async () => {
    const user = userEvent.setup()
    const onChange = vi.fn()
    render(<StatusFilter value="all" onChange={onChange} />)
    await user.tab()
    await user.tab()
    await user.keyboard('{Enter}')
    expect(onChange).toHaveBeenCalledWith('not_started')
  })

  it('mostra a contagem de cada filtro no nome', async () => {
    const counts = { all: 6, not_started: 3, in_progress: 1, completed: 2 }
    const { container } = render(<StatusFilter value="all" onChange={() => {}} counts={counts} />)
    expect(screen.getByRole('button', { name: 'Em andamento (1)' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Todas (6)' })).toBeInTheDocument()
    await expectNoA11yViolations(container)
  })
})
