import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { useState } from 'react'
import { describe, expect, it, vi } from 'vitest'
import { expectNoA11yViolations } from '../../../test/axe'
import { readCss } from '../../../test/css-file'
import { Menu, MenuCheckItem, MenuGroup, MenuItem } from './Menu'

function Harness({
  placement = 'popover',
  blocked = false,
  onAct = () => {},
  onKeyDown = () => {},
}: {
  placement?: 'popover' | 'sheet'
  blocked?: boolean
  onAct?: () => void
  onKeyDown?: () => void
}) {
  const [on, setOn] = useState(false)
  return (
    <main>
      <div role="presentation" onKeyDown={onKeyDown}>
        <p>fora</p>
        <Menu label="Ajudas" buttonContent="Ajudas" placement={placement} blocked={blocked}>
          <MenuItem onSelect={onAct}>Verificar</MenuItem>
          <MenuGroup label="Automática">
            <MenuCheckItem checked={on} onChange={setOn}>
              Verificar ao digitar
            </MenuCheckItem>
          </MenuGroup>
          <MenuGroup label="Rascunho">
            <MenuItem disabled onSelect={onAct}>
              Confirmar rascunho
            </MenuItem>
          </MenuGroup>
        </Menu>
      </div>
    </main>
  )
}

const button = () => screen.getByRole('button', { name: 'Ajudas' })

describe('Menu', () => {
  it('expõe papéis e estados acessíveis', async () => {
    const user = userEvent.setup()
    render(<Harness />)
    expect(button()).toHaveAttribute('aria-haspopup', 'menu')
    expect(button()).toHaveAttribute('aria-expanded', 'false')
    await user.click(button())
    expect(button()).toHaveAttribute('aria-expanded', 'true')
    expect(screen.getByRole('menu', { name: 'Ajudas' })).toBeVisible()
    expect(screen.getByRole('group', { name: 'Automática' })).toBeVisible()
    expect(screen.getByRole('menuitemcheckbox', { name: 'Verificar ao digitar' })).toHaveAttribute(
      'aria-checked',
      'false',
    )
    expect(screen.getByRole('menuitem', { name: 'Confirmar rascunho' })).toHaveAttribute(
      'aria-disabled',
      'true',
    )
    await expectNoA11yViolations(document.body)
  })

  it('abre com o foco no primeiro item e fecha com Esc devolvendo o foco ao botão', async () => {
    const user = userEvent.setup()
    render(<Harness />)
    await user.click(button())
    expect(screen.getByRole('menuitem', { name: 'Verificar' })).toHaveFocus()
    await user.keyboard('{Escape}')
    expect(screen.queryByRole('menu')).not.toBeInTheDocument()
    expect(button()).toHaveFocus()
  })

  it('fecha com clique fora e com Tab', async () => {
    const user = userEvent.setup()
    render(<Harness />)
    await user.click(button())
    await user.click(screen.getByText('fora'))
    expect(screen.queryByRole('menu')).not.toBeInTheDocument()
    await user.click(button())
    await user.keyboard('{Tab}')
    expect(screen.queryByRole('menu')).not.toBeInTheDocument()
  })

  it('setas, Home e End percorrem os itens com volta; desabilitado é focável e não age', async () => {
    const user = userEvent.setup()
    const onAct = vi.fn()
    render(<Harness onAct={onAct} />)
    await user.click(button())
    await user.keyboard('{ArrowDown}')
    expect(screen.getByRole('menuitemcheckbox')).toHaveFocus()
    await user.keyboard('{ArrowDown}')
    const disabled = screen.getByRole('menuitem', { name: 'Confirmar rascunho' })
    expect(disabled).toHaveFocus()
    await user.keyboard('{Enter}')
    expect(onAct).not.toHaveBeenCalled()
    expect(screen.getByRole('menu')).toBeVisible()
    await user.keyboard('{ArrowDown}')
    expect(screen.getByRole('menuitem', { name: 'Verificar' })).toHaveFocus()
    await user.keyboard('{ArrowUp}')
    expect(disabled).toHaveFocus()
    await user.keyboard('{Home}')
    expect(screen.getByRole('menuitem', { name: 'Verificar' })).toHaveFocus()
    await user.keyboard('{End}')
    expect(disabled).toHaveFocus()
  })

  it('menuitem fecha ao agir e menuitemcheckbox não', async () => {
    const user = userEvent.setup()
    const onAct = vi.fn()
    render(<Harness onAct={onAct} />)
    await user.click(button())
    await user.click(screen.getByRole('menuitemcheckbox'))
    expect(screen.getByRole('menuitemcheckbox')).toHaveAttribute('aria-checked', 'true')
    expect(screen.getByRole('menu')).toBeVisible()
    await user.click(screen.getByRole('menuitem', { name: 'Verificar' }))
    expect(onAct).toHaveBeenCalledOnce()
    expect(screen.queryByRole('menu')).not.toBeInTheDocument()
    expect(button()).toHaveFocus()
  })

  it('as teclas dentro do menu não sobem para os pais', async () => {
    const user = userEvent.setup()
    const onKeyDown = vi.fn()
    render(<Harness onKeyDown={onKeyDown} />)
    await user.click(button())
    onKeyDown.mockClear()
    await user.keyboard('{ArrowDown}?x{Escape}')
    expect(onKeyDown).not.toHaveBeenCalled()
  })

  it('bloqueado, o botão não abre o menu', async () => {
    const user = userEvent.setup()
    render(<Harness blocked />)
    await user.click(button())
    expect(screen.queryByRole('menu')).not.toBeInTheDocument()
  })

  it('o painel de baixo usa a colocação sheet', async () => {
    const user = userEvent.setup()
    render(<Harness placement="sheet" />)
    await user.click(button())
    expect(screen.getByRole('menu').className).toMatch(/sheet/)
    expect(readCss('Menu.module.css')).toMatch(/\.sheet \.item\s*\{[^}]*min-height:\s*48px/)
  })
})
