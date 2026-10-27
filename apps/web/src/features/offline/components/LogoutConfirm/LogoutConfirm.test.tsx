import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { expectNoA11yViolations } from '../../../../test/axe'
import { LogoutConfirm } from './LogoutConfirm'

describe('LogoutConfirm', () => {
  it('não aparece fechado', () => {
    render(<LogoutConfirm open={false} onConfirm={vi.fn()} onCancel={vi.fn()} />)
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  })

  it('avisa que sair descarta o progresso e oferece as duas saídas', async () => {
    const onConfirm = vi.fn()
    const onCancel = vi.fn()
    render(<LogoutConfirm open onConfirm={onConfirm} onCancel={onCancel} />)
    const dialog = screen.getByRole('dialog', { name: 'Sair agora?' })
    expect(dialog).toHaveTextContent('Sair agora descarta esse progresso.')
    await expectNoA11yViolations(document.body)
    await userEvent.click(screen.getByRole('button', { name: 'Cancelar' }))
    expect(onCancel).toHaveBeenCalledOnce()
    await userEvent.click(screen.getByRole('button', { name: 'Sair mesmo assim' }))
    expect(onConfirm).toHaveBeenCalledOnce()
  })
})
