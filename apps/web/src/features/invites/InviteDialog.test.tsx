import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { expectNoA11yViolations } from '../../test/axe'
import { InviteDialog, type InviteResult } from './InviteDialog'

const created: InviteResult = {
  kind: 'created',
  code: 'ABCD-EFGH-JKLM-NPQR',
  expiresAt: '2026-10-21T15:00:00.000Z',
}

function renderDialog(result: InviteResult | null, extra: { count?: number | null } = {}) {
  const onClose = vi.fn()
  const view = render(
    <InviteDialog
      result={result}
      activeCount={extra.count ?? null}
      oldestExpiresAt={null}
      onClose={onClose}
    />,
  )
  return { onClose, ...view }
}

afterEach(() => {
  vi.restoreAllMocks()
})

describe('InviteDialog', () => {
  it('mostra o código, "Uso único", a validade e a contagem de ativos', () => {
    renderDialog(created, { count: 1 })
    expect(screen.getByText('ABCD-EFGH-JKLM-NPQR')).toBeInTheDocument()
    expect(screen.getByText('Uso único')).toBeInTheDocument()
    expect(screen.getByText('Válido até 21 de outubro')).toBeInTheDocument()
    expect(screen.getByText('1 convite ativo')).toBeInTheDocument()
  })

  it('se a contagem falhou mostra só o código', () => {
    renderDialog(created, { count: null })
    expect(screen.queryByText(/convites? ativos?/)).not.toBeInTheDocument()
    expect(screen.getByText('ABCD-EFGH-JKLM-NPQR')).toBeInTheDocument()
  })

  it('"Copiar" usa a área de transferência quando existe', async () => {
    const writeText = vi.fn().mockResolvedValue(undefined)
    const user = userEvent.setup()
    renderDialog(created)
    Object.defineProperty(navigator, 'clipboard', { value: { writeText }, configurable: true })
    await user.click(screen.getByRole('button', { name: 'Copiar' }))
    expect(writeText).toHaveBeenCalledWith('ABCD-EFGH-JKLM-NPQR')
    expect(await screen.findByText('Copiado')).toBeInTheDocument()
  })

  it('sem área de transferência seleciona o texto do código', async () => {
    const user = userEvent.setup()
    Object.defineProperty(navigator, 'clipboard', { value: undefined, configurable: true })
    renderDialog(created)
    await user.click(screen.getByRole('button', { name: 'Copiar' }))
    expect(window.getSelection()?.toString()).toBe('ABCD-EFGH-JKLM-NPQR')
  })

  it('o foco inicial é "Pronto", e Esc fecha', async () => {
    const user = userEvent.setup()
    const { onClose } = renderDialog(created)
    expect(screen.getByRole('button', { name: 'Pronto' })).toHaveFocus()
    await user.keyboard('{Escape}')
    expect(onClose).toHaveBeenCalled()
  })

  it('não tem violações de acessibilidade', async () => {
    renderDialog(created, { count: 2 })
    await expectNoA11yViolations(screen.getByRole('dialog'))
  })

  it('falha geral mostra uma mensagem sem detalhe técnico', () => {
    renderDialog({ kind: 'failed' })
    expect(screen.getByRole('dialog')).toHaveTextContent('Não foi possível criar o convite')
  })
})
