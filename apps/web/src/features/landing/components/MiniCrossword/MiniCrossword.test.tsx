import { fireEvent, render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { expectNoA11yViolations } from '../../../../test/axe'
import { readCss } from '../../../../test/css-file'
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
const clue = (text: RegExp) => screen.getByRole('button', { name: text })

afterEach(() => vi.unstubAllGlobals())

describe('MiniCrossword', () => {
  it('abre com C, O e S, a quarta casa selecionada e a primeira dica em destaque', () => {
    renderMini()
    expect(cell(0, 0)).toHaveTextContent('C')
    expect(cell(0, 1)).toHaveTextContent('O')
    expect(cell(0, 2)).toHaveTextContent('S')
    expect(cell(0, 3)).toHaveAttribute('aria-selected', 'true')
    expect(clue(/Faixa de terra junto ao mar/)).toHaveAttribute('aria-current', 'true')
    expect(screen.getByRole('status')).toHaveTextContent('0 de 6 palavras certas.')
  })

  it('tem rótulo, título e as dicas em Horizontais e Verticais', () => {
    renderMini()
    expect(screen.getByText('Experimente')).toBeInTheDocument()
    expect(
      screen.getByRole('heading', { level: 2, name: 'Uma mini cruzada, bem aqui.' }),
    ).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'Horizontais' })).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'Verticais' })).toBeInTheDocument()
    expect(screen.getAllByRole('listitem')).toHaveLength(6)
  })

  it('preenche pelo teclado físico, avança a seleção e confere a palavra', async () => {
    const user = userEvent.setup()
    renderMini()
    grid().focus()
    await user.keyboard('TA')
    expect(cell(0, 3)).toHaveTextContent('T')
    expect(cell(0, 4)).toHaveTextContent('A')
    expect(screen.getByRole('status')).toHaveTextContent('1 de 6 palavras certas.')
    expect(clue(/Faixa de terra junto ao mar/)).toHaveTextContent('resolvida')
    await user.keyboard('{Backspace}')
    expect(cell(0, 4)).not.toHaveTextContent('A')
    expect(screen.getByRole('status')).toHaveTextContent('0 de 6 palavras certas.')
  })

  it('conta a palavra certa também com letra acentuada', async () => {
    const user = userEvent.setup()
    renderMini()
    grid().focus()
    await user.keyboard('TÁ')
    expect(screen.getByRole('status')).toHaveTextContent('1 de 6 palavras certas.')
  })

  it('mouse: seleciona uma casa e o segundo clique troca a direção', async () => {
    const user = userEvent.setup()
    renderMini()
    await user.click(cell(2, 2))
    expect(cell(2, 2)).toHaveAttribute('aria-selected', 'true')
    expect(clue(/O planeta Terra/)).toHaveAttribute('aria-current', 'true')
    await user.click(cell(2, 2))
    expect(clue(/Aparelho que mede a profundidade/)).toHaveAttribute('aria-current', 'true')
  })

  it('clicar numa dica leva à palavra dela', async () => {
    const user = userEvent.setup()
    renderMini()
    await user.click(clue(/Pôr do sol/))
    expect(cell(4, 0)).toHaveAttribute('aria-selected', 'true')
    expect(clue(/Pôr do sol/)).toHaveAttribute('aria-current', 'true')
  })

  it('setas movem entre as casas abertas', async () => {
    const user = userEvent.setup()
    renderMini()
    await user.click(cell(0, 0))
    await user.keyboard('{ArrowDown}')
    expect(cell(1, 0)).toHaveAttribute('aria-selected', 'true')
  })

  it('Tab anda entre as palavras e deixa a grade na última; Shift+Tab, na primeira', async () => {
    const user = userEvent.setup()
    renderMini()
    grid().focus()
    await user.keyboard('{Tab}')
    expect(clue(/O planeta Terra/)).toHaveAttribute('aria-current', 'true')
    await user.keyboard('{Shift>}{Tab}{/Shift}')
    expect(clue(/Faixa de terra junto ao mar/)).toHaveAttribute('aria-current', 'true')
    // Primeira palavra: Shift+Tab não é interceptado (o foco sai da grade).
    expect(fireEvent.keyDown(grid(), { key: 'Tab', shiftKey: true })).toBe(true)
    await user.click(clue(/Partícula de matéria/))
    expect(fireEvent.keyDown(grid(), { key: 'Tab' })).toBe(true)
    // No meio, Tab é interceptado.
    await user.click(clue(/Pôr do sol/))
    expect(fireEvent.keyDown(grid(), { key: 'Tab' })).toBe(false)
  })

  it('teclado do celular: letras e Backspace chegam pelo campo escondido', async () => {
    const user = userEvent.setup()
    renderMini()
    const input = screen.getByLabelText('Letras da mini cruzada')
    // A palavra já vem selecionada: clicar de novo na mesma casa trocaria a direção.
    await user.click(cell(0, 4))
    await user.click(cell(0, 3))
    fireEvent.input(input, { target: { value: '​T' }, inputType: 'insertText' })
    fireEvent.input(input, { target: { value: '​A' }, inputType: 'insertText' })
    expect(cell(0, 3)).toHaveTextContent('T')
    expect(cell(0, 4)).toHaveTextContent('A')
    fireEvent.input(input, { target: { value: '' }, inputType: 'deleteContentBackward' })
    expect(cell(0, 4)).not.toHaveTextContent('A')
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

  it('resolvida, mostra a mensagem e o convite, e "Limpar" volta ao começo', async () => {
    const user = userEvent.setup()
    renderMini()
    const fill = async (name: RegExp, letters: string) => {
      await user.click(clue(name))
      await user.keyboard(`{Home}${letters}`)
    }
    await fill(/Faixa de terra junto ao mar/, 'COSTA')
    await fill(/O planeta Terra/, 'MUNDO')
    await fill(/Pôr do sol/, 'OCASO')
    await fill(/Terreno de futebol/, 'CAMPO')
    await fill(/Aparelho que mede/, 'SONDA')
    await fill(/Partícula de matéria/, 'ATOMO')
    const status = screen.getByRole('status')
    expect(status).toHaveTextContent('Resolvida! Amanhã tem outra.')
    expect(screen.getByRole('link', { name: 'Jogar a cruzada de hoje' })).toHaveAttribute(
      'href',
      '/jogar',
    )
    await user.click(screen.getByRole('button', { name: 'Limpar' }))
    expect(screen.queryByRole('link', { name: 'Jogar a cruzada de hoje' })).not.toBeInTheDocument()
    expect(within(screen.getByRole('status')).getByText(/0 de 6/)).toBeInTheDocument()
    expect(cell(0, 2)).toHaveTextContent('S')
    expect(cell(0, 3)).not.toHaveTextContent('T')
  })

  it('"Limpar" no meio do jogo volta às três letras do começo', async () => {
    const user = userEvent.setup()
    renderMini()
    grid().focus()
    await user.keyboard('TA')
    await user.click(screen.getByRole('button', { name: 'Limpar' }))
    expect(cell(0, 0)).toHaveTextContent('C')
    expect(cell(0, 3)).not.toHaveTextContent('T')
    expect(cell(0, 3)).toHaveAttribute('aria-selected', 'true')
  })

  it('não usa rede nem guarda nada no aparelho', async () => {
    const fetchSpy = vi.fn()
    vi.stubGlobal('fetch', fetchSpy)
    const open = vi.fn()
    vi.stubGlobal('indexedDB', { open })
    const user = userEvent.setup()
    renderMini()
    grid().focus()
    await user.keyboard('TA')
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

  describe('CSS', () => {
    const css = readCss('MiniCrossword.module.css')

    it('o salto do acerto só roda com animação permitida', () => {
      expect(css.slice(0, css.indexOf('@media (prefers-reduced-motion'))).not.toContain('animation')
      expect(css).toContain('animation: pop')
    })

    it('só lê tokens: nenhuma cor fixa', () => {
      expect(css).not.toMatch(/#[0-9a-f]{3,8}\b/i)
    })

    it('a âncora fica longe do topo e o foco do tabuleiro é visível', () => {
      expect(css).toContain('scroll-margin-top')
      expect(css).toMatch(/\.grid:focus-visible\s*\{[^}]*outline:[^;]*var\(--focus\)/)
    })
  })
})
