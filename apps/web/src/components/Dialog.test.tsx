import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { useState } from 'react'
import { describe, expect, it, vi } from 'vitest'
import { expectNoA11yViolations } from '../test/axe'
import { Dialog } from './Dialog'

function Harness({ onClose = () => {} }: { onClose?: () => void }) {
  const [open, setOpen] = useState(false)
  return (
    <div id="root">
      <button onClick={() => setOpen(true)}>Abrir</button>
      <Dialog
        open={open}
        onClose={() => {
          onClose()
          setOpen(false)
        }}
        title="Convite criado"
        description="Mande este código."
      >
        <button>Copiar</button>
        <button data-autofocus>Pronto</button>
      </Dialog>
    </div>
  )
}

describe('Dialog', () => {
  it('expõe papel, título e descrição acessíveis', async () => {
    const user = userEvent.setup()
    const { container } = render(<Harness />)
    await user.click(screen.getByRole('button', { name: 'Abrir' }))
    const dialog = screen.getByRole('dialog', { name: 'Convite criado' })
    expect(dialog).toHaveAttribute('aria-modal', 'true')
    expect(dialog).toHaveAccessibleDescription('Mande este código.')
    await expectNoA11yViolations(document.body)
    expect(container).toBeInTheDocument()
  })

  it('põe o foco no botão principal e o devolve à origem ao fechar com Esc', async () => {
    const user = userEvent.setup()
    const onClose = vi.fn()
    render(<Harness onClose={onClose} />)
    const opener = screen.getByRole('button', { name: 'Abrir' })
    await user.click(opener)
    expect(screen.getByRole('button', { name: 'Pronto' })).toHaveFocus()
    await user.keyboard('{Escape}')
    expect(onClose).toHaveBeenCalledTimes(1)
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    expect(opener).toHaveFocus()
  })

  it('prende o foco dentro do diálogo', async () => {
    const user = userEvent.setup()
    render(<Harness />)
    await user.click(screen.getByRole('button', { name: 'Abrir' }))
    expect(screen.getByRole('button', { name: 'Pronto' })).toHaveFocus()
    await user.tab()
    expect(screen.getByRole('button', { name: 'Copiar' })).toHaveFocus()
    await user.tab({ shift: true })
    expect(screen.getByRole('button', { name: 'Pronto' })).toHaveFocus()
    await user.tab({ shift: true })
    expect(screen.getByRole('button', { name: 'Copiar' })).toHaveFocus()
    await user.tab({ shift: true })
    expect(screen.getByRole('button', { name: 'Pronto' })).toHaveFocus()
  })

  it('deixa o resto da página inerte enquanto está aberto', async () => {
    const user = userEvent.setup()
    const { container } = render(<Harness />)
    await user.click(screen.getByRole('button', { name: 'Abrir' }))
    expect(container.querySelector('#root')).toHaveAttribute('inert')
    await user.keyboard('{Escape}')
    expect(container.querySelector('#root')).not.toHaveAttribute('inert')
  })

  // Largura (feature 024): `size="wide"` põe a classe de largura maior no painel; sem a prop, não.
  it('aplica a classe de largura só com size="wide"', () => {
    const { rerender } = render(
      <Dialog open onClose={() => {}} title="Padrão">
        <button>ok</button>
      </Dialog>,
    )
    const classes = () => screen.getByRole('dialog').className.split(' ')
    const base = classes()
    expect(base).toHaveLength(1)

    rerender(
      <Dialog open onClose={() => {}} title="Padrão" size="wide">
        <button>ok</button>
      </Dialog>,
    )
    expect(classes()).toHaveLength(2)
    expect(classes()).toContain(base[0])
  })
})
