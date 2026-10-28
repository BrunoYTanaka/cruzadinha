import { act, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { installGameTestLifecycle, openGuestGame, setup } from '../../test/game-harness'
import { desktop, mockMatchMedia, phone } from '../../test/media'

installGameTestLifecycle()

afterEach(() => vi.unstubAllGlobals())

const opener = () => screen.getByRole('button', { name: 'Atalhos de teclado' })
const dialog = () => screen.queryByRole('dialog', { name: 'Atalhos de teclado' })
const cell = (n: number) =>
  screen.getByRole('gridcell', { name: new RegExp(`Linha 1, coluna ${n},`) })
const timer = () => screen.getByRole('timer', { hidden: true }).textContent

describe('diálogo de atalhos (feature 046)', () => {
  it('o botão abre o diálogo; digitar com ele aberto não escreve atrás; Esc fecha e devolve o foco', async () => {
    const user = setup()
    openGuestGame()
    await screen.findByRole('grid')
    await user.click(opener())
    expect(dialog()).toBeInTheDocument()
    await user.keyboard('ABC{ArrowRight}')
    await user.keyboard('{Escape}')
    expect(dialog()).not.toBeInTheDocument()
    expect(opener()).toHaveFocus()
    expect(cell(1)).toHaveAccessibleName(/vazia/)
  })

  it('? abre a lista sem escrever, com ou sem Shift; Ctrl+? não; campo de texto não', async () => {
    const user = setup()
    openGuestGame()
    const grid = await screen.findByRole('grid')
    await user.click(grid)
    await user.keyboard('?')
    expect(dialog()).toBeInTheDocument()
    expect(cell(1)).toHaveAccessibleName(/vazia/)
    await user.keyboard('?')
    expect(screen.getAllByRole('dialog')).toHaveLength(1)
    await user.keyboard('{Escape}')
    await user.keyboard('{Control>}?{/Control}')
    expect(dialog()).not.toBeInTheDocument()
    await user.keyboard('{Shift>}?{/Shift}')
    expect(dialog()).toBeInTheDocument()
  })

  it('o Esc que fecha o diálogo não chega ao tabuleiro: o Tab seguinte ainda muda de palavra', async () => {
    const user = setup()
    openGuestGame()
    await user.click(await screen.findByRole('grid'))
    await user.keyboard('?{Escape}')
    await user.click(cell(1))
    await user.keyboard('{Tab}')
    expect(screen.getByRole('grid')).toHaveFocus()
  })

  it('abrir e fechar 10 vezes não muda o tabuleiro', async () => {
    const user = setup()
    openGuestGame()
    await user.click(await screen.findByRole('grid'))
    await user.keyboard('C')
    const before = screen.getByRole('grid').innerHTML
    for (let i = 0; i < 10; i++) {
      await user.click(opener())
      await user.keyboard('{Escape}')
    }
    expect(screen.getByRole('grid').innerHTML).toBe(before)
  })

  it('o relógio para com o diálogo aberto e uma pausa continua pausada depois', async () => {
    const user = setup()
    openGuestGame()
    await user.click(await screen.findByRole('grid'))
    await user.keyboard('C')
    await user.click(opener())
    const frozen = timer()
    await vi.advanceTimersByTimeAsync(10_000)
    expect(timer()).toBe(frozen)
    await user.keyboard('{Escape}')
    await user.click(screen.getByRole('button', { name: 'Pausar' }))
    await user.keyboard('?')
    expect(dialog()).toBeInTheDocument()
    await user.keyboard('{Escape}')
    expect(screen.getAllByRole('button', { name: 'Continuar' }).length).toBeGreaterThan(0)
  })

  it('sem teclado na tela existem botão e ?; com teclado na tela não existe nenhum', async () => {
    const media = mockMatchMedia(desktop)
    const user = setup()
    openGuestGame()
    await screen.findByRole('grid')
    expect(opener()).toBeInTheDocument()
    act(() => media.change(phone))
    expect(screen.queryByRole('button', { name: 'Atalhos de teclado' })).not.toBeInTheDocument()
    await user.keyboard('?')
    expect(dialog()).not.toBeInTheDocument()
  })

  it('Alt+? e Meta+? não abrem; ? em campo de texto não abre; ? num botão da barra e no corpo abrem', async () => {
    const user = setup()
    openGuestGame()
    await user.click(await screen.findByRole('grid'))
    await user.keyboard('{Alt>}?{/Alt}')
    await user.keyboard('{Meta>}?{/Meta}')
    expect(dialog()).not.toBeInTheDocument()
    const input = document.createElement('input')
    document.body.append(input)
    input.focus()
    await user.keyboard('?')
    input.remove()
    expect(dialog()).not.toBeInTheDocument()
    screen.getByRole('button', { name: 'Pausar' }).focus()
    await user.keyboard('?')
    expect(dialog()).toBeInTheDocument()
    await user.keyboard('{Escape}')
    ;(document.activeElement as HTMLElement).blur()
    await user.keyboard('?')
    expect(dialog()).toBeInTheDocument()
  })

  it('? com o foco fora da tela (configurações, conclusão, cabeçalho) não abre os atalhos', async () => {
    const user = setup()
    openGuestGame()
    await screen.findByRole('grid')
    // configurações e conclusão ficam em portal, fora da tela do jogo
    const outside = document.createElement('button')
    document.body.append(outside)
    outside.focus()
    await user.keyboard('?')
    outside.remove()
    expect(dialog()).not.toBeInTheDocument()
  })

  it('numa janela de 721 a 860 px sem teclado na tela existem botão e ?', async () => {
    mockMatchMedia((query) => query === '(min-width: 721px)')
    const user = setup()
    openGuestGame()
    await screen.findByRole('grid')
    expect(opener()).toBeInTheDocument()
    await user.keyboard('?')
    expect(dialog()).toBeInTheDocument()
  })
})
