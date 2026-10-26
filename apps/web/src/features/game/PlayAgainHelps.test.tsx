import { cleanup, screen, waitFor } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { cellsFrom, makeProgress, PUZZLE_ID } from '../../test/fixtures'
import {
  installGameTestLifecycle,
  openGame,
  openGuestGame,
  RESET,
  SAVE,
  setup,
} from '../../test/game-harness'
import { jsonResponse } from '../../test/http'
import { guestStore } from '../guest/guest-store'

installGameTestLifecycle()

// Completa CAL / A#O / SOL deixando a última letra para a ajuda de letra.
async function playWithHelpAndComplete(user: ReturnType<typeof setup>) {
  await screen.findByRole('grid')
  await user.click(screen.getByRole('grid'))
  await user.keyboard('CAL{ArrowDown}OL')
  await user.click(screen.getByRole('gridcell', { name: 'Linha 2, coluna 1, vazia' }))
  await user.keyboard('AS{ArrowRight}')
  await user.click(screen.getByRole('button', { name: /Revelar letra/ }))
  await screen.findByRole('dialog', { name: 'Cruzada concluída' })
  await user.click(screen.getByRole('button', { name: 'Ver o tabuleiro' }))
}

const letterButton = () => screen.getByRole('button', { name: /Revelar letra/ })

describe('"Jogar de novo" zera as ajudas (issue #86)', () => {
  it('visitante', async () => {
    const user = setup()
    openGuestGame()
    await playWithHelpAndComplete(user)
    await user.click(screen.getByRole('button', { name: 'Jogar de novo' }))
    await waitFor(() =>
      expect(screen.getByRole('button', { name: /Revelar letra/ })).toHaveTextContent('0/4'),
    )
    cleanup()
    openGuestGame()
    await screen.findByRole('grid')
    await waitFor(() => expect(letterButton()).toHaveTextContent('0/4'))
  })

  it('conta', async () => {
    const user = setup()
    openGame({
      [SAVE]: () => jsonResponse(200, { progress: makeProgress({ status: 'completed' }) }),
      [RESET]: () => jsonResponse(200, { progress: makeProgress() }),
    })
    await playWithHelpAndComplete(user)
    await user.click(screen.getByRole('button', { name: 'Jogar de novo' }))
    await waitFor(() =>
      expect(screen.getByRole('button', { name: /Revelar letra/ })).toHaveTextContent('0/4'),
    )
    cleanup()
    openGame({ [RESET]: () => jsonResponse(200, { progress: makeProgress() }) })
    await screen.findByRole('grid')
    await waitFor(() => expect(letterButton()).toHaveTextContent('0/4'))
  })

  it('visitante que reabre uma concluída com ajuda guardada', async () => {
    await guestStore.save({
      puzzleId: PUZZLE_ID,
      date: '2026-10-14',
      cells: cellsFrom(['CAL', 'A#O', 'SOL']),
      elapsedMs: 12_000,
      status: 'completed',
      savedAt: new Date().toISOString(),
      help: { usage: { letters: 1, words: 0 }, marks: {}, locked: ['0,0'] },
    })
    const user = setup()
    openGuestGame()
    await user.click(await screen.findByRole('button', { name: 'Jogar de novo' }))
    await waitFor(() => expect(letterButton()).toHaveTextContent('0/4'))
    cleanup()
    openGuestGame()
    await screen.findByRole('grid')
    await waitFor(() => expect(letterButton()).toHaveTextContent('0/4'))
  })
})
