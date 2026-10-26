import { screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { expectNoA11yViolations } from '../../test/axe'
import { makeNeighbourPuzzle, makeSolution, NEIGHBOURS, PUZZLE_ID } from '../../test/fixtures'
import { installGameTestLifecycle, openGuestGame, PUZZLE, setup } from '../../test/game-harness'
import { jsonResponse } from '../../test/http'

installGameTestLifecycle()

// Cruzada clássica (feature 030): sem blocos, com palavras vizinhas coladas.
const neighbours = () =>
  openGuestGame({
    [PUZZLE]: () =>
      jsonResponse(200, {
        puzzleId: PUZZLE_ID,
        puzzle: makeNeighbourPuzzle(),
        solution: makeSolution(NEIGHBOURS),
      }),
  })

describe('jogo com palavras vizinhas', () => {
  it('abre o tabuleiro com a barra entre as vizinhas e a atribuição da fonte', async () => {
    neighbours()
    const grid = await screen.findByRole('grid')
    expect(grid.querySelectorAll('[data-bar-across]')).toHaveLength(2)
    expect(await screen.findByRole('heading', { level: 1 })).toHaveTextContent(/Cruzadas Clube/)
  })

  it('digitar a palavra inteira não passa à vizinha, e Tab vai para ela', async () => {
    const user = setup()
    neighbours()
    await user.click(await screen.findByRole('grid'))
    await user.keyboard('AB')
    expect(screen.getByRole('grid')).toHaveAttribute('aria-activedescendant', 'cell-0-1')
    await user.keyboard('{Tab}')
    expect(screen.getByRole('grid')).toHaveAttribute('aria-activedescendant', 'cell-0-2')
  })

  it('completa a cruzada e abre a janela de conclusão', async () => {
    const user = setup()
    neighbours()
    await user.click(await screen.findByRole('grid'))
    await user.keyboard('AB{Tab}CD{Tab}EF{Tab}GH{Tab}IJKL')
    expect(await screen.findByRole('dialog', { name: 'Cruzada concluída' })).toBeInTheDocument()
  })

  it('não tem violações de acessibilidade', async () => {
    const { container } = neighbours()
    await screen.findByRole('grid')
    await expectNoA11yViolations(container)
  })
})
