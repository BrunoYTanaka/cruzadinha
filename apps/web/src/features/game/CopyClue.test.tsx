import { act, screen, waitFor } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { expectNoA11yViolations } from '../../test/axe'
import { cellsFrom, makeProgress } from '../../test/fixtures'
import {
  installGameTestLifecycle,
  openGame,
  openGuestGame,
  PROGRESS,
  setup,
} from '../../test/game-harness'
import { jsonResponse } from '../../test/http'
import { resetSettingsStore, updateSettings } from '../settings/settings-store'
import { COPY_NOTICE_MS } from './useCopyClue'

installGameTestLifecycle()

afterEach(() => {
  resetSettingsStore()
})

const withLetters = {
  [PROGRESS]: () =>
    jsonResponse(200, { progress: makeProgress({ cells: cellsFrom(['C.L', '.#.', '...']) }) }),
}

// O userEvent troca o `navigator.clipboard` ao ser criado; o espião vem depois.
function spyClipboard(writeText = vi.fn().mockResolvedValue(undefined)) {
  Object.defineProperty(navigator, 'clipboard', { value: { writeText }, configurable: true })
  return writeText
}

const clue = (name: RegExp) => screen.getByRole('button', { name })

describe('copiar a dica com duplo clique (feature 033)', () => {
  it('com a opção ligada copia "dica (n): letras" e avisa', async () => {
    updateSettings({ copyClue: true })
    const user = setup()
    openGame(withLetters)
    await screen.findByRole('grid')
    const writeText = spyClipboard()
    await user.dblClick(clue(/^1 ?Dica 1 horizontal/))
    expect(writeText).toHaveBeenCalledExactlyOnceWith('Dica 1 horizontal (3): C_L')
    expect(await screen.findByText('Dica copiada')).toBeInTheDocument()
    // Região viva educada: o `role="status"` já anuncia o texto sem interromper.
    expect(screen.getByText('Dica copiada').closest('[role="status"]')).not.toBeNull()
  })

  it('copia a palavra vertical com as letras do cruzamento', async () => {
    updateSettings({ copyClue: true })
    const user = setup()
    openGame(withLetters)
    await screen.findByRole('grid')
    const writeText = spyClipboard()
    await user.dblClick(clue(/^1 ?Dica 1 vertical/))
    expect(writeText).toHaveBeenCalledWith('Dica 1 vertical (3): C__')
  })

  it('o visitante copia do mesmo jeito', async () => {
    updateSettings({ copyClue: true })
    const user = setup()
    openGuestGame()
    await screen.findByRole('grid')
    const writeText = spyClipboard()
    await user.dblClick(clue(/^1 ?Dica 1 horizontal/))
    expect(writeText).toHaveBeenCalledWith('Dica 1 horizontal (3): ___')
  })

  it('com a opção desligada não copia nem avisa, e o clique simples seleciona a palavra', async () => {
    const user = setup()
    openGame(withLetters)
    await screen.findByRole('grid')
    const writeText = spyClipboard()
    await user.dblClick(clue(/^1 ?Dica 1 horizontal/))
    expect(writeText).not.toHaveBeenCalled()
    expect(screen.queryByText('Dica copiada')).toBeNull()
    expect(clue(/^1 ?Dica 1 horizontal/)).toHaveAttribute('aria-current', 'true')
  })

  it('ligar a opção com a tela aberta vale já, sem recarregar', async () => {
    const user = setup()
    openGame(withLetters)
    await screen.findByRole('grid')
    const writeText = spyClipboard()
    act(() => updateSettings({ copyClue: true }))
    await user.dblClick(clue(/^1 ?Dica 1 horizontal/))
    expect(writeText).toHaveBeenCalledTimes(1)
  })

  it('dois cliques numa célula não copiam', async () => {
    updateSettings({ copyClue: true })
    const user = setup()
    openGame(withLetters)
    const board = await screen.findByRole('grid')
    const writeText = spyClipboard()
    const cell = board.querySelector('[role="gridcell"]') as HTMLElement
    await user.dblClick(cell)
    expect(writeText).not.toHaveBeenCalled()
  })

  it('dois cliques na dica da barra copiam; nos botões anterior e próxima, não', async () => {
    updateSettings({ copyClue: true })
    const user = setup()
    openGame(withLetters)
    await screen.findByRole('grid')
    const writeText = spyClipboard()
    const live = document.querySelector(
      '[aria-live="polite"][aria-atomic="true"] span',
    ) as HTMLElement
    await user.dblClick(live)
    expect(writeText).toHaveBeenCalledTimes(1)
    const next = screen.queryByRole('button', { name: 'Próxima dica' })
    if (next) {
      await user.dblClick(next)
      expect(writeText).toHaveBeenCalledTimes(1)
    }
  })

  it('o duplo clique não muda a grade nem as ajudas', async () => {
    updateSettings({ copyClue: true })
    const user = setup()
    openGame(withLetters)
    await screen.findByRole('grid')
    spyClipboard()
    const before = document.getElementById('board')?.textContent
    await user.dblClick(clue(/^1 ?Dica 1 horizontal/))
    expect(document.getElementById('board')?.textContent).toBe(before)
    expect(screen.getByText(/^0\/\d+ Letra$/)).toBeInTheDocument()
  })

  it('com o jogo pausado não copia nem avisa', async () => {
    updateSettings({ copyClue: true })
    const user = setup()
    openGame(withLetters)
    await screen.findByRole('grid')
    await user.click(screen.getByRole('button', { name: 'Pausar' }))
    const writeText = spyClipboard()
    await user.dblClick(clue(/^1 ?Dica 1 horizontal/))
    expect(writeText).not.toHaveBeenCalled()
    expect(screen.queryByText('Dica copiada')).toBeNull()
  })

  it('área de transferência recusada mostra o aviso de falha e o jogo segue', async () => {
    updateSettings({ copyClue: true })
    const user = setup()
    openGame(withLetters)
    await screen.findByRole('grid')
    spyClipboard(vi.fn().mockRejectedValue(new Error('negado')))
    await user.dblClick(clue(/^1 ?Dica 1 horizontal/))
    expect(await screen.findByText('Não foi possível copiar')).toBeInTheDocument()
    expect(screen.getByRole('grid')).toBeInTheDocument()
  })

  it('página sem a API de área de transferência também avisa a falha', async () => {
    updateSettings({ copyClue: true })
    const user = setup()
    openGame(withLetters)
    await screen.findByRole('grid')
    Object.defineProperty(navigator, 'clipboard', { value: undefined, configurable: true })
    await user.dblClick(clue(/^1 ?Dica 1 horizontal/))
    expect(await screen.findByText('Não foi possível copiar')).toBeInTheDocument()
  })

  it('o aviso some sozinho e um novo duplo clique reinicia o prazo, sem empilhar', async () => {
    updateSettings({ copyClue: true })
    const user = setup()
    openGame(withLetters)
    await screen.findByRole('grid')
    spyClipboard()
    await user.dblClick(clue(/^1 ?Dica 1 horizontal/))
    await screen.findByText('Dica copiada')
    await act(() => vi.advanceTimersByTimeAsync(COPY_NOTICE_MS - 500))
    await user.dblClick(clue(/^1 ?Dica 1 horizontal/))
    await act(() => vi.advanceTimersByTimeAsync(1000))
    expect(screen.getAllByText('Dica copiada')).toHaveLength(1)
    await act(() => vi.advanceTimersByTimeAsync(COPY_NOTICE_MS))
    await waitFor(() => expect(screen.queryByText('Dica copiada')).toBeNull())
  })

  it('o aviso não tem violações de acessibilidade', async () => {
    updateSettings({ copyClue: true })
    const user = setup()
    const { container } = openGame(withLetters)
    await screen.findByRole('grid')
    spyClipboard()
    await user.dblClick(clue(/^1 ?Dica 1 horizontal/))
    await screen.findByText('Dica copiada')
    await expectNoA11yViolations(container)
  })
})
