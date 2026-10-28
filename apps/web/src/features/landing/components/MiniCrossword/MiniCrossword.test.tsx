import { fireEvent, render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { expectNoA11yViolations } from '../../../../test/axe'
import { MiniCrossword } from './MiniCrossword'

const renderMini = () =>
  render(
    <MemoryRouter>
      <MiniCrossword />
    </MemoryRouter>,
  )

const cell = (row: number, col: number) =>
  document.getElementById(`mini-cruzada-${row}-${col}`) as HTMLElement
const grid = () => screen.getByRole('grid', { name: 'Mini cruzada 5 por 5' })

afterEach(() => vi.unstubAllGlobals())

describe('MiniCrossword', () => {
  it('começa na primeira palavra horizontal, com a dica dela', () => {
    renderMini()
    expect(cell(0, 0)).toHaveAttribute('aria-selected', 'true')
    expect(screen.getByText('1 horizontal: Até este momento')).toBeInTheDocument()
  })

  it('preenche uma palavra pelo teclado físico e avança a seleção', async () => {
    const user = userEvent.setup()
    renderMini()
    grid().focus()
    await user.keyboard('AIN')
    expect(cell(0, 0)).toHaveTextContent('A')
    expect(cell(0, 1)).toHaveTextContent('I')
    expect(cell(0, 2)).toHaveTextContent('N')
    expect(cell(0, 3)).toHaveAttribute('aria-selected', 'true')
    await user.keyboard('{Backspace}')
    expect(cell(0, 2)).not.toHaveTextContent('N')
  })

  it('mouse: seleciona uma casa e o segundo clique troca a direção', async () => {
    const user = userEvent.setup()
    renderMini()
    await user.click(cell(2, 2))
    expect(cell(2, 2)).toHaveAttribute('aria-selected', 'true')
    expect(screen.getByText('4 horizontal: Festa com música e dança')).toBeInTheDocument()
    await user.click(cell(2, 2))
    expect(screen.getByText('2 vertical: Quando o céu escurece')).toBeInTheDocument()
  })

  it('setas movem entre as casas abertas', async () => {
    const user = userEvent.setup()
    renderMini()
    grid().focus()
    await user.keyboard('{ArrowDown}')
    expect(cell(1, 0)).toHaveAttribute('aria-selected', 'true')
  })

  it('teclado do celular: letras e Backspace chegam pelo campo escondido', async () => {
    const user = userEvent.setup()
    renderMini()
    const input = screen.getByLabelText('Letras da mini cruzada')
    // A primeira palavra já vem selecionada: clicar nela de novo trocaria a direção.
    await user.click(cell(0, 1))
    await user.click(cell(0, 0))
    fireEvent.input(input, { target: { value: '\u200bA' }, inputType: 'insertText' })
    fireEvent.input(input, { target: { value: '\u200bI' }, inputType: 'insertText' })
    expect(cell(0, 0)).toHaveTextContent('A')
    expect(cell(0, 1)).toHaveTextContent('I')
    fireEvent.input(input, { target: { value: '' }, inputType: 'deleteContentBackward' })
    expect(cell(0, 1)).not.toHaveTextContent('I')
  })

  it('ao tocar numa casa abre o teclado da tela (foca o campo)', () => {
    vi.stubGlobal('requestAnimationFrame', (callback: FrameRequestCallback) => {
      callback(0)
      return 0
    })
    renderMini()
    fireEvent.pointerDown(cell(0, 1), { pointerType: 'touch' })
    expect(screen.getByLabelText('Letras da mini cruzada')).toHaveFocus()
  })

  it('resolvida, mostra a mensagem, o convite e deixa jogar de novo', async () => {
    const user = userEvent.setup()
    renderMini()
    grid().focus()
    // Horizontais 1, 4 e 5 mais as verticais pelas casas cruzadas.
    await user.keyboard('AINDA')
    await user.click(cell(2, 0))
    await user.keyboard('BAILE')
    await user.click(cell(4, 0))
    await user.keyboard('MOEDA')
    await user.click(cell(0, 0))
    await user.click(cell(0, 0))
    await user.keyboard('ALBUM')
    // A direção vertical se mantém ao escolher outra casa que tem palavra nela.
    await user.click(cell(0, 4))
    await user.keyboard('AREIA')
    await user.click(cell(0, 2))
    await user.keyboard('NOITE')
    const status = screen.getByRole('status')
    expect(status).toHaveTextContent('Você completou a mini cruzada!')
    expect(within(status).getByRole('link', { name: 'Jogar a cruzada de hoje' })).toHaveAttribute(
      'href',
      '/jogar',
    )
    await user.click(within(status).getByRole('button', { name: 'Jogar de novo' }))
    expect(screen.queryByRole('status')).not.toBeInTheDocument()
    expect(cell(0, 0)).not.toHaveTextContent('A')
  })

  it('não usa rede nem guarda nada no aparelho', async () => {
    const fetchSpy = vi.fn()
    vi.stubGlobal('fetch', fetchSpy)
    const open = vi.fn()
    vi.stubGlobal('indexedDB', { open })
    const user = userEvent.setup()
    renderMini()
    grid().focus()
    await user.keyboard('AINDA')
    expect(fetchSpy).not.toHaveBeenCalled()
    expect(open).not.toHaveBeenCalled()
    expect(localStorage.length).toBe(0)
  })

  it.each(['light', 'dark'])('passa no axe no tema %s', async (theme) => {
    document.documentElement.dataset.theme = theme
    const { container } = renderMini()
    await expectNoA11yViolations(container)
    delete document.documentElement.dataset.theme
  })
})
