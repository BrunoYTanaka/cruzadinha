import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { createMemoryRouter, RouterProvider } from 'react-router'
import { describe, expect, it, vi } from 'vitest'
import { expectNoA11yViolations } from '../../../../../test/axe'
import { CompletionDialog } from './CompletionDialog'

function renderDialog(props: Partial<Parameters<typeof CompletionDialog>[0]> = {}) {
  const onViewBoard = vi.fn()
  const router = createMemoryRouter(
    [
      {
        path: '/',
        element: (
          <CompletionDialog
            open
            onViewBoard={onViewBoard}
            elapsedMs={468_000}
            bestMs={400_000}
            confirmed
            helpsUsed={2}
            isRecord={false}
            {...props}
          />
        ),
      },
      { path: '/biblioteca', element: <p>Outra tela</p> },
      { path: '/jogo/:id', element: <p>Outro jogo</p> },
    ],
    { initialEntries: ['/'] },
  )
  render(<RouterProvider router={router} />)
  return { onViewBoard, router }
}

describe('CompletionDialog', () => {
  it('mostra tempo, melhor tempo e ajudas, com o texto "Cruzada concluída"', () => {
    renderDialog()
    expect(screen.getByRole('dialog', { name: 'Cruzada concluída' })).toBeInTheDocument()
    expect(screen.getByText('07:48')).toBeInTheDocument()
    expect(screen.getByText('06:40')).toBeInTheDocument()
    expect(screen.getByText('2')).toBeInTheDocument()
    expect(screen.getByText(/7 minutos e 48 segundos/)).toBeInTheDocument()
  })

  it('destaca o novo recorde por texto', () => {
    renderDialog({ isRecord: true, bestMs: 468_000 })
    expect(screen.getByText('Novo recorde')).toBeInTheDocument()
  })

  it('sem confirmação mostra "—" no melhor tempo e o aviso', () => {
    renderDialog({ confirmed: false, bestMs: null })
    expect(screen.getByText('—')).toBeInTheDocument()
    expect(screen.getByRole('status')).toHaveTextContent('Vamos registrar quando a conexão voltar.')
  })

  it('o foco inicial é "Voltar à biblioteca"', () => {
    renderDialog()
    expect(screen.getByRole('button', { name: 'Voltar à biblioteca' })).toHaveFocus()
  })

  it('"Ver o tabuleiro" e Esc fecham', async () => {
    const user = userEvent.setup()
    const { onViewBoard } = renderDialog()
    await user.click(screen.getByRole('button', { name: 'Ver o tabuleiro' }))
    await user.keyboard('{Escape}')
    expect(onViewBoard).toHaveBeenCalledTimes(2)
  })

  it('não tem violações de acessibilidade', async () => {
    renderDialog()
    await expectNoA11yViolations(document.body)
  })

  describe('atalho para a outra fonte do dia (feature 015)', () => {
    it('oferece jogar a outra fonte, com o foco nele', async () => {
      const { router } = renderDialog({
        otherSource: { name: 'Cruzada Online', href: '/jogo/x' },
      })
      const dialog = screen.getByRole('dialog', { name: 'Cruzada concluída' })
      expect(dialog).toHaveTextContent('Também há cruzada deste dia em Cruzada Online.')
      const link = screen.getByRole('link', { name: 'Jogar Cruzada Online deste dia' })
      expect(link).toHaveAttribute('href', '/jogo/x')
      expect(link).toHaveFocus()
      expect(screen.getByRole('button', { name: 'Voltar à biblioteca' })).toBeInTheDocument()
      expect(screen.getByRole('button', { name: 'Ver o tabuleiro' })).toBeInTheDocument()
      await expectNoA11yViolations(document.body)
      await userEvent.setup().click(link)
      expect(router.state.location.pathname).toBe('/jogo/x')
    })

    it('sem outra fonte, fica como antes', async () => {
      renderDialog()
      expect(screen.queryByText(/Também há cruzada deste dia/)).not.toBeInTheDocument()
      expect(screen.queryByRole('link')).not.toBeInTheDocument()
      expect(screen.getByRole('button', { name: 'Voltar à biblioteca' })).toHaveFocus()
      await expectNoA11yViolations(document.body)
    })
  })
})
