import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { createMemoryRouter, RouterProvider } from 'react-router'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { expectNoA11yViolations } from '../../../../../test/axe'
import { CompletionDialog } from './CompletionDialog'

const renderShareCard = vi.hoisted(() => vi.fn())
vi.mock('../../../helpers/share-card', () => ({ renderShareCard }))

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
            shareCard={{ source: 'oglobo', date: '2026-10-30' }}
            shareText={'Cruzadinha · O Globo · 30/10/2026\nConcluí em 07:48'}
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

  describe('compartilhar o resultado (feature 052)', () => {
    afterEach(() => {
      Object.defineProperty(navigator, 'clipboard', { value: undefined, configurable: true })
      Object.defineProperty(navigator, 'share', { value: undefined, configurable: true })
    })

    it('copia o texto, avisa "Resultado copiado" e deixa foco e ordem como estavam', async () => {
      const user = userEvent.setup() // instala a própria área de transferência: vem antes do stub
      const writeText = vi.fn().mockResolvedValue(undefined)
      Object.defineProperty(navigator, 'clipboard', { value: { writeText }, configurable: true })
      renderDialog({ localOnly: true, confirmed: false, bestMs: null })
      const names = screen.getAllByRole('button').map((button) => button.textContent)
      expect(names.slice(-3)).toEqual(['Voltar à biblioteca', 'Ver o tabuleiro', 'Compartilhar'])
      expect(screen.getByRole('button', { name: 'Voltar à biblioteca' })).toHaveFocus()
      await user.click(screen.getByRole('button', { name: 'Compartilhar' }))
      await user.click(screen.getByRole('button', { name: 'Compartilhar texto' }))
      expect(writeText).toHaveBeenCalledWith('Cruzadinha · O Globo · 30/10/2026\nConcluí em 07:48')
      expect(await screen.findByText('Resultado copiado')).toBeInTheDocument()
      await expectNoA11yViolations(document.body)
    })

    it('sem cópia nem compartilhamento, mostra o texto selecionado e avisa', async () => {
      const user = userEvent.setup()
      Object.defineProperty(navigator, 'clipboard', { value: undefined, configurable: true })
      renderDialog()
      await user.click(screen.getByRole('button', { name: 'Compartilhar' }))
      await user.click(screen.getByRole('button', { name: 'Compartilhar texto' }))
      expect(
        await screen.findByText('Não foi possível copiar sozinho. Copie o texto abaixo.'),
      ).toBeInTheDocument()
      const field = screen.getByRole('textbox', { name: 'Texto do resultado' })
      expect(field).toHaveValue('Cruzadinha · O Globo · 30/10/2026\nConcluí em 07:48')
      expect(field).toHaveFocus()
      expect(field).toHaveAttribute('readonly')
      expect((field as HTMLTextAreaElement).selectionEnd).toBeGreaterThan(0)
      await expectNoA11yViolations(document.body)
    })

    it('"Compartilhar imagem" desenha o cartão e baixa o PNG quando nada mais existe', async () => {
      const user = userEvent.setup()
      const blob = new Blob(['png'], { type: 'image/png' })
      renderShareCard.mockResolvedValue(blob)
      Object.defineProperty(navigator, 'canShare', { value: undefined, configurable: true })
      Object.defineProperty(navigator, 'clipboard', { value: undefined, configurable: true })
      URL.createObjectURL = vi.fn(() => 'blob:x')
      URL.revokeObjectURL = vi.fn()
      vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {})
      renderDialog()
      await user.click(screen.getByRole('button', { name: 'Compartilhar' }))
      await user.click(screen.getByRole('button', { name: 'Compartilhar imagem' }))
      expect(renderShareCard).toHaveBeenCalledWith({
        source: 'oglobo',
        date: '2026-10-30',
        elapsedMs: 468_000,
      })
      expect(await screen.findByText('Imagem baixada')).toBeInTheDocument()
      await expectNoA11yViolations(document.body)
    })

    it('avisa quando não consegue gerar a imagem', async () => {
      const user = userEvent.setup()
      renderShareCard.mockResolvedValue(null)
      renderDialog()
      await user.click(screen.getByRole('button', { name: 'Compartilhar' }))
      await user.click(screen.getByRole('button', { name: 'Compartilhar imagem' }))
      expect(await screen.findByText('Não foi possível gerar a imagem.')).toBeInTheDocument()
    })

    it('"Voltar" e Esc voltam ao resultado, sem fechar a janela', async () => {
      const user = userEvent.setup()
      const { onViewBoard } = renderDialog()
      await user.click(screen.getByRole('button', { name: 'Compartilhar' }))
      expect(screen.getByRole('dialog', { name: 'Compartilhar resultado' })).toBeInTheDocument()
      expect(screen.getByRole('button', { name: 'Compartilhar texto' })).toHaveFocus()
      await expectNoA11yViolations(document.body)
      await user.click(screen.getByRole('button', { name: 'Voltar' }))
      expect(screen.getByRole('dialog', { name: 'Cruzada concluída' })).toBeInTheDocument()
      expect(screen.getByRole('button', { name: 'Compartilhar' })).toHaveFocus()
      await user.click(screen.getByRole('button', { name: 'Compartilhar' }))
      await user.keyboard('{Escape}')
      expect(screen.getByRole('dialog', { name: 'Cruzada concluída' })).toBeInTheDocument()
      expect(onViewBoard).not.toHaveBeenCalled()
    })
  })
})
