import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { expectNoA11yViolations } from '../../../../../test/axe'
import { SHORTCUT_GROUPS } from '../../../helpers/shortcuts'
import { ShortcutsDialog } from './ShortcutsDialog'

describe('ShortcutsDialog', () => {
  it('lista cada grupo e cada descrição, com o nome falado das setas', () => {
    render(<ShortcutsDialog open onClose={() => {}} />)
    for (const group of SHORTCUT_GROUPS) {
      expect(screen.getByRole('heading', { name: group.title })).toBeInTheDocument()
      for (const shortcut of group.shortcuts) {
        expect(screen.getByText(shortcut.description)).toBeInTheDocument()
      }
    }
    expect(screen.getByText('seta para a esquerda')).toBeInTheDocument()
  })

  it('fecha com Esc, "Fechar" e clique fora', async () => {
    const onClose = vi.fn()
    const user = userEvent.setup()
    render(<ShortcutsDialog open onClose={onClose} />)
    await user.keyboard('{Escape}')
    await user.click(screen.getByRole('button', { name: 'Fechar' }))
    await user.click(screen.getByRole('dialog').parentElement as HTMLElement)
    expect(onClose).toHaveBeenCalledTimes(3)
  })

  it.each(['light', 'dark'])('passa no axe no tema %s', async (theme) => {
    document.documentElement.dataset.theme = theme
    render(<ShortcutsDialog open onClose={() => {}} />)
    await expectNoA11yViolations(screen.getByRole('dialog'))
    delete document.documentElement.dataset.theme
  })
})
