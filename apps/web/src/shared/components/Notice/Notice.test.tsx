import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { expectNoA11yViolations } from '../../../test/axe'
import { Notice } from './Notice'

describe('Notice', () => {
  it('anuncia avisos com role status e erros com role alert', () => {
    const { rerender } = render(<Notice>Salvo.</Notice>)
    expect(screen.getByRole('status')).toHaveTextContent('Salvo.')
    rerender(<Notice variant="warning">Atenção.</Notice>)
    expect(screen.getByRole('status')).toHaveTextContent('Atenção.')
    rerender(<Notice variant="error">Falhou.</Notice>)
    expect(screen.getByRole('alert')).toHaveTextContent('Falhou.')
  })

  it('mostra o botão de ação e o aciona sem tomar o foco sozinho', async () => {
    const user = userEvent.setup()
    const onClick = vi.fn()
    const { container } = render(
      <Notice variant="warning" action={{ label: 'Ver como ficou', onClick }}>
        Esta cruzada já foi concluída em outro aparelho
      </Notice>,
    )
    expect(document.body).toHaveFocus()
    await user.click(screen.getByRole('button', { name: 'Ver como ficou' }))
    expect(onClick).toHaveBeenCalledTimes(1)
    await expectNoA11yViolations(container)
  })
})
