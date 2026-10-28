import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { ShortcutsButton } from './ShortcutsButton'

describe('ShortcutsButton', () => {
  it('tem o nome acessível e chama onOpen ao clicar', async () => {
    const onOpen = vi.fn()
    render(<ShortcutsButton onOpen={onOpen} />)
    await userEvent.click(screen.getByRole('button', { name: 'Atalhos de teclado' }))
    expect(onOpen).toHaveBeenCalledOnce()
  })
})
