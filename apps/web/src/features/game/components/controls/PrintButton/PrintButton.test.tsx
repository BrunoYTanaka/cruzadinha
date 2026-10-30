import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { PrintButton } from './PrintButton'

describe('PrintButton', () => {
  it('tem o nome acessível e chama onPrint ao clicar', async () => {
    const onPrint = vi.fn()
    render(<PrintButton onPrint={onPrint} />)
    await userEvent.click(screen.getByRole('button', { name: 'Imprimir' }))
    expect(onPrint).toHaveBeenCalledOnce()
  })

  it('funciona pelo teclado', async () => {
    const onPrint = vi.fn()
    render(<PrintButton onPrint={onPrint} />)
    await userEvent.tab()
    await userEvent.keyboard('{Enter}')
    expect(onPrint).toHaveBeenCalledOnce()
  })
})
