import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { expectNoA11yViolations } from '../../../../../test/axe'
import { HelpsMenu } from './HelpsMenu'

function setup(props: Partial<Parameters<typeof HelpsMenu>[0]> = {}) {
  const handlers = {
    onVerify: vi.fn(),
    onVerifyOnType: vi.fn(),
    onPencil: vi.fn(),
    onConfirm: vi.fn(),
    onDiscard: vi.fn(),
  }
  const view = render(
    <main>
      <HelpsMenu
        placement="popover"
        pencil={false}
        hasDraft
        verifyOnType={false}
        {...handlers}
        {...props}
      />
    </main>,
  )
  return { ...handlers, ...view, user: userEvent.setup() }
}

const open = (user: ReturnType<typeof userEvent.setup>, name = 'Ajudas') =>
  user.click(screen.getByRole('button', { name }))
const item = (name: string) =>
  screen.queryByRole('menuitem', { name }) ?? screen.getByRole('menuitemcheckbox', { name })

describe('HelpsMenu', () => {
  it('lista os itens e os grupos', async () => {
    const { user } = setup()
    await open(user)
    expect(item('Verificar')).toBeVisible()
    expect(screen.getByRole('group', { name: 'Automática' })).toBeVisible()
    expect(screen.getByRole('group', { name: 'Rascunho' })).toBeVisible()
    for (const name of [
      'Verificar ao digitar',
      'Lápis',
      'Confirmar rascunho',
      'Descartar rascunho',
    ])
      expect(item(name)).toBeVisible()
    await expectNoA11yViolations(document.body)
  })

  it('pausado desabilita verificar, lápis e rascunho, mas não a verificação automática', async () => {
    const { user, onVerify, onVerifyOnType, onPencil } = setup({ disabled: true })
    await open(user)
    for (const name of ['Verificar', 'Lápis', 'Confirmar rascunho', 'Descartar rascunho'])
      expect(item(name)).toHaveAttribute('aria-disabled', 'true')
    expect(item('Verificar ao digitar')).not.toHaveAttribute('aria-disabled')
    await user.click(item('Verificar'))
    await user.click(item('Lápis'))
    expect(onVerify).not.toHaveBeenCalled()
    expect(onPencil).not.toHaveBeenCalled()
    await user.click(item('Verificar ao digitar'))
    expect(onVerifyOnType).toHaveBeenCalledWith(true)
  })

  it('sem rascunho na palavra, confirmar e descartar não agem', async () => {
    const { user, onConfirm, onDiscard } = setup({ hasDraft: false })
    await open(user)
    for (const name of ['Confirmar rascunho', 'Descartar rascunho']) {
      expect(item(name)).toHaveAttribute('aria-disabled', 'true')
      await user.click(item(name))
    }
    expect(onConfirm).not.toHaveBeenCalled()
    expect(onDiscard).not.toHaveBeenCalled()
  })

  it('o ponto e o nome acompanham a verificação automática', () => {
    const { rerender } = setup()
    expect(screen.getByRole('button', { name: 'Ajudas' })).toBeInTheDocument()
    rerender(
      <main>
        <HelpsMenu
          placement="popover"
          pencil={false}
          hasDraft
          verifyOnType
          onVerify={vi.fn()}
          onVerifyOnType={vi.fn()}
          onPencil={vi.fn()}
          onConfirm={vi.fn()}
          onDiscard={vi.fn()}
        />
      </main>,
    )
    expect(
      screen.getByRole('button', { name: 'Ajudas, verificação automática ligada' }),
    ).toBeInTheDocument()
  })

  it('cada item chama o seu retorno uma vez e o lápis expõe aria-checked', async () => {
    const { user, onVerify, onPencil, onConfirm, onDiscard } = setup({ pencil: true })
    await open(user)
    expect(item('Lápis')).toHaveAttribute('aria-checked', 'true')
    await user.click(item('Lápis'))
    expect(onPencil).toHaveBeenCalledWith(false)
    await user.click(item('Verificar'))
    expect(onVerify).toHaveBeenCalledOnce()
    await open(user)
    await user.click(item('Confirmar rascunho'))
    expect(onConfirm).toHaveBeenCalledOnce()
    expect(screen.getByRole('status')).toHaveTextContent('Rascunho confirmado')
    await open(user)
    await user.click(item('Descartar rascunho'))
    expect(onDiscard).toHaveBeenCalledOnce()
    expect(screen.getByRole('status')).toHaveTextContent('Rascunho descartado')
  })
})
