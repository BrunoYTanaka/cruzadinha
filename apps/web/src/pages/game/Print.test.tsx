import { screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { apiError } from '../../test/http'
import {
  installGameTestLifecycle,
  openGame,
  openGuestGame,
  PUZZLE,
  setup,
} from '../../test/game-harness'

installGameTestLifecycle()

afterEach(() => vi.unstubAllGlobals())

const printButton = () => screen.getByRole('button', { name: 'Imprimir' })
const sheet = () => document.body.querySelector('[class*="sheet"]') as HTMLElement
const timer = () => screen.getByRole('timer', { hidden: true }).textContent

describe('imprimir a cruzada (feature 055)', () => {
  it('imprime sem mexer no jogo, sem rede e sem arquivo; a folha continua sem letras', async () => {
    const print = vi.fn()
    vi.stubGlobal('print', print)
    const fetchSpy = vi.fn()
    vi.stubGlobal('fetch', fetchSpy)
    const createObjectURL = vi.fn()
    vi.stubGlobal('URL', Object.assign(URL, { createObjectURL }))
    const user = setup()
    openGuestGame()
    await user.click(await screen.findByRole('grid'))
    await user.keyboard('C')
    const cell = screen.getByRole('gridcell', { name: /Linha 1, coluna 1,/ })
    const before = { cell: cell.getAttribute('aria-label'), time: timer() }
    fetchSpy.mockClear()
    await user.click(printButton())
    expect(print).toHaveBeenCalledOnce()
    expect(fetchSpy).not.toHaveBeenCalled()
    expect(createObjectURL).not.toHaveBeenCalled()
    expect(cell.getAttribute('aria-label')).toBe(before.cell)
    expect(timer()).toBe(before.time)
    expect(sheet().textContent).not.toMatch(/CAL|SOL|\bC\b/)
    const letters = Array.from(sheet().querySelectorAll('[class*="cell"]')).map(
      (c) => c.textContent,
    )
    expect(letters.every((text) => /^\d*$/.test(text ?? ''))).toBe(true)
  })

  it('sem window.print o botão não quebra a tela', async () => {
    vi.stubGlobal('print', undefined)
    const user = setup()
    openGuestGame()
    await screen.findByRole('grid')
    await user.click(printButton())
    expect(screen.getByRole('grid')).toBeInTheDocument()
  })

  it('não há botão enquanto a cruzada não carregou nem em erro de carregamento', async () => {
    openGame({ [PUZZLE]: () => apiError(404, 'puzzle-unavailable') })
    await screen.findByText('Cruzada não encontrada.')
    expect(screen.queryByRole('button', { name: 'Imprimir' })).not.toBeInTheDocument()
  })
})
