import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { useMemo, useReducer } from 'react'
import { describe, expect, it } from 'vitest'
import { createGame } from '../../game-logic/reducer'
import type { GameState } from '../../game-logic/state'
import { expectNoA11yViolations } from '../../test/axe'
import {
  LAYOUT5,
  makeNeighbourPuzzle,
  makePuzzle,
  makeSolution,
  NEIGHBOURS,
} from '../../test/fixtures'
import { activeWord } from '../../game-logic/navigation'
import { Board } from './Board'
import { boardKeyToAction } from './board-keys'
import { ClueBar } from './ClueBar'

function Harness({
  rows = LAYOUT5,
  readOnly = false,
  neighbours = false,
  patch,
}: {
  rows?: string[]
  readOnly?: boolean
  // Cruzada clássica sem blocos, com palavras vizinhas coladas (feature 030).
  neighbours?: boolean
  patch?: (state: GameState) => GameState
}) {
  const game = useMemo(
    () =>
      createGame({
        puzzle: neighbours ? makeNeighbourPuzzle() : makePuzzle(rows),
        solution: makeSolution(neighbours ? NEIGHBOURS : rows),
        limits: { letters: 4, words: 2 },
      }),
    [rows, neighbours],
  )
  const [state, dispatch] = useReducer(game.reducer, game.initialState, (initial) =>
    patch ? patch(initial) : initial,
  )
  const word = activeWord(game.index, state.selected, state.direction)
  return (
    <div>
      <ClueBar word={word} />
      <Board
        puzzle={game.index.puzzle}
        index={game.index}
        state={state}
        readOnly={readOnly}
        onSelect={(position) => dispatch({ type: 'select', position })}
        onKey={(key) => dispatch(boardKeyToAction(key))}
      />
      <button>Depois do tabuleiro</button>
    </div>
  )
}

const grid = () => screen.getByRole('grid')
const activeCell = () => document.getElementById(grid().getAttribute('aria-activedescendant') ?? '')

describe('Board', () => {
  it('é uma grade com uma única parada de tabulação', async () => {
    const user = userEvent.setup()
    render(<Harness />)
    expect(grid()).toHaveAccessibleName('Palavras cruzadas 5 por 5')
    expect(grid()).toHaveAttribute('tabindex', '0')
    for (const cell of screen.getAllByRole('gridcell')) expect(cell).not.toHaveAttribute('tabindex')
    await user.tab()
    expect(grid()).toHaveFocus()
  })

  it('Tab e Shift+Tab dão a volta nas palavras sem sair do tabuleiro', async () => {
    const user = userEvent.setup()
    render(<Harness />)
    await user.tab()
    const first = screen.getByText(/^Dica /).textContent
    // Shift+Tab na primeira palavra vai à última, e Tab na última volta à primeira.
    await user.tab({ shift: true })
    expect(grid()).toHaveFocus()
    expect(screen.getByText(/^Dica /).textContent).not.toBe(first)
    await user.tab()
    expect(grid()).toHaveFocus()
    expect(screen.getByText(/^Dica /).textContent).toBe(first)
  })

  it('Esc libera o próximo Tab para sair do tabuleiro, nos dois sentidos', async () => {
    const user = userEvent.setup()
    render(<Harness />)
    await user.tab()
    await user.keyboard('{Escape}')
    await user.tab()
    expect(screen.getByRole('button', { name: 'Depois do tabuleiro' })).toHaveFocus()
    await user.tab({ shift: true })
    expect(grid()).toHaveFocus()
    await user.keyboard('{Escape}')
    await user.tab({ shift: true })
    expect(grid()).not.toHaveFocus()
  })

  it('Esc só vale para o Tab seguinte: outra tecla volta a prender o Tab nas palavras', async () => {
    const user = userEvent.setup()
    render(<Harness />)
    await user.tab()
    await user.keyboard('{Escape}{ArrowRight}')
    await user.tab()
    expect(grid()).toHaveFocus()
  })

  it('o tabuleiro explica como sair com o teclado', () => {
    render(<Harness />)
    expect(grid()).toHaveAccessibleDescription(
      'Tab e Shift+Tab mudam de palavra. Delete apaga a letra sem mover; Home e End vão ao início e ao fim da palavra. Para sair do tabuleiro, aperte Esc e depois Tab.',
    )
  })

  it('descreve cada célula: linha, coluna e letra ou vazia', async () => {
    const user = userEvent.setup()
    render(<Harness />)
    expect(screen.getByRole('gridcell', { name: 'Linha 1, coluna 2, vazia' })).toBeInTheDocument()
    await user.tab()
    await user.keyboard('C')
    expect(screen.getByRole('gridcell', { name: 'Linha 1, coluna 2, letra C' })).toBeInTheDocument()
    // blocos ficam fora da leitura
    expect(screen.queryByRole('gridcell', { name: /Linha 1, coluna 1/ })).not.toBeInTheDocument()
  })

  it('a célula selecionada é a ativa do tabuleiro e a palavra ativa fica marcada', async () => {
    const user = userEvent.setup()
    render(<Harness />)
    await user.tab()
    expect(activeCell()).toHaveAccessibleName('Linha 1, coluna 2, vazia')
    expect(activeCell()).toHaveAttribute('aria-selected', 'true')
    const marked = document.querySelectorAll('[data-in-word]')
    expect(marked).toHaveLength(4) // CASA
  })

  it('digita, avança, e Backspace volta uma célula', async () => {
    const user = userEvent.setup()
    render(<Harness />)
    await user.tab()
    await user.keyboard('CA')
    expect(activeCell()).toHaveAccessibleName('Linha 1, coluna 4, vazia')
    await user.keyboard('{Backspace}')
    expect(activeCell()).toHaveAccessibleName('Linha 1, coluna 3, vazia')
    expect(screen.getByRole('gridcell', { name: 'Linha 1, coluna 2, letra C' })).toBeInTheDocument()
  })

  it('Delete apaga a letra sem mover; Home e End vão às pontas da palavra', async () => {
    const user = userEvent.setup()
    render(<Harness />)
    await user.tab()
    await user.keyboard('CASA')
    await user.click(screen.getByRole('gridcell', { name: 'Linha 1, coluna 3, letra A' }))
    await user.keyboard('{Delete}')
    expect(activeCell()).toHaveAccessibleName('Linha 1, coluna 3, vazia')
    await user.keyboard('{Home}')
    expect(activeCell()).toHaveAccessibleName('Linha 1, coluna 2, letra C')
    await user.keyboard('{End}')
    expect(activeCell()).toHaveAccessibleName('Linha 1, coluna 5, letra A')
  })

  it('ignora teclas que não são letras e deixa passar atalhos do navegador', async () => {
    const user = userEvent.setup()
    render(<Harness />)
    await user.tab()
    await user.keyboard('1 -')
    await user.keyboard('{Control>}a{/Control}')
    expect(screen.getAllByRole('gridcell', { name: /vazia/ })).toHaveLength(21)
  })

  it('as setas movem a seleção', async () => {
    const user = userEvent.setup()
    render(<Harness />)
    await user.tab()
    await user.keyboard('{ArrowRight}')
    expect(activeCell()).toHaveAccessibleName('Linha 1, coluna 3, vazia')
    await user.keyboard('{ArrowDown}')
    expect(activeCell()).toHaveAccessibleName('Linha 3, coluna 3, vazia')
  })

  it('Tab anda entre palavras e Shift+Tab volta', async () => {
    const user = userEvent.setup()
    render(<Harness />)
    await user.tab()
    expect(screen.getByText('Dica 1 horizontal')).toBeInTheDocument()
    await user.tab() // próxima palavra: 4 horizontal
    expect(grid()).toHaveFocus()
    expect(screen.getByText('Dica 4 horizontal')).toBeInTheDocument()
    await user.tab({ shift: true }) // volta à 1 horizontal
    expect(screen.getByText('Dica 1 horizontal')).toBeInTheDocument()
  })

  it('Tab na última palavra volta à primeira, sem sair do tabuleiro', async () => {
    const user = userEvent.setup()
    render(<Harness />)
    await user.tab()
    for (let step = 0; step < 10; step++) await user.tab() // 1H … 4V
    expect(screen.getByText('Dica 4 vertical')).toBeInTheDocument()
    await user.tab()
    expect(grid()).toHaveFocus()
    expect(screen.getByText('Dica 1 horizontal')).toBeInTheDocument()
  })

  it('clicar seleciona, e clicar de novo na mesma célula alterna a direção', async () => {
    const user = userEvent.setup()
    render(<Harness />)
    const cell = screen.getByRole('gridcell', { name: 'Linha 2, coluna 2, vazia' })
    await user.click(cell)
    expect(activeCell()).toBe(cell)
    expect(screen.getByText('Dica 4 horizontal')).toBeInTheDocument()
    await user.click(cell)
    expect(screen.getByText('Dica 1 vertical')).toBeInTheDocument()
    await user.click(cell)
    expect(screen.getByText('Dica 4 horizontal')).toBeInTheDocument()
  })

  it('a dica ativa é anunciada numa região viva e muda com a seleção', async () => {
    const user = userEvent.setup()
    render(<Harness />)
    const live = screen.getByText('Dica 1 horizontal').closest('[aria-live]')
    expect(live).toHaveAttribute('aria-live', 'polite')
    await user.click(screen.getByRole('gridcell', { name: 'Linha 3, coluna 1, vazia' }))
    expect(within(live as HTMLElement).getByText('Dica 6 horizontal')).toBeInTheDocument()
  })

  it('mostra as marcas de ajuda no nome da célula', () => {
    render(
      <Harness
        patch={(state) => ({
          ...state,
          cells: state.cells.map((row, r) => (r === 0 ? [null, 'C', 'X', null, null] : row)),
          marks: { '0,1': 'helped', '0,2': 'wrong' },
        })}
      />,
    )
    expect(
      screen.getByRole('gridcell', { name: 'Linha 1, coluna 2, letra C, com ajuda' }),
    ).toBeInTheDocument()
    expect(
      screen.getByRole('gridcell', { name: 'Linha 1, coluna 3, letra X, errada na verificação' }),
    ).toBeInTheDocument()
  })

  it('em modo leitura não há seleção, foco nem teclado', async () => {
    const user = userEvent.setup()
    render(
      <Harness readOnly patch={(state) => ({ ...state, mode: 'completed', selected: null })} />,
    )
    expect(grid()).toHaveAttribute('tabindex', '-1')
    expect(grid()).not.toHaveAttribute('aria-activedescendant')
    expect(document.querySelectorAll('[aria-selected="true"]')).toHaveLength(0)
    await user.click(screen.getByRole('gridcell', { name: 'Linha 2, coluna 2, vazia' }))
    expect(document.querySelectorAll('[aria-selected="true"]')).toHaveLength(0)
    expect(grid()).toHaveAttribute('aria-readonly', 'true')
  })

  it('passa nas regras de acessibilidade', async () => {
    const { container } = render(<Harness />)
    await expectNoA11yViolations(container)
  })

  describe('barras entre palavras vizinhas', () => {
    const barred = (container: HTMLElement, attribute: 'across' | 'down') =>
      Array.from(container.querySelectorAll(`[data-bar-${attribute}]`)).map(
        (cell) => `${cell.getAttribute('data-row')},${cell.getAttribute('data-col')}`,
      )

    it('marca o fim das palavras que têm vizinha colada', () => {
      const { container } = render(<Harness neighbours />)
      expect(barred(container, 'across')).toEqual(['0,1', '1,1'])
      expect(barred(container, 'down')).toEqual([])
    })

    it('não marca nada numa grade comum', () => {
      const { container } = render(<Harness />)
      expect(container.querySelectorAll('[data-bar-across], [data-bar-down]')).toHaveLength(0)
    })

    it('a barra não altera o rótulo nem a navegação por teclado', async () => {
      const user = userEvent.setup()
      render(<Harness neighbours />)
      await user.click(screen.getByRole('grid'))
      await user.keyboard('AB')
      expect(screen.getByRole('grid')).toHaveAttribute('aria-activedescendant', 'cell-0-1')
    })

    it('não tem violações de acessibilidade', async () => {
      const { container } = render(<Harness neighbours />)
      await expectNoA11yViolations(container)
    })
  })
})
