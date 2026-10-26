import { screen, waitFor, within } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { cellsFrom, makeProgress } from '../../test/fixtures'
import { openGame, PROGRESS, RESET, setup, installGameTestLifecycle } from '../../test/game-harness'
import { apiError, jsonResponse } from '../../test/http'

installGameTestLifecycle()

const completed = () =>
  makeProgress({
    cells: cellsFrom(['CAL', 'A#O', 'SOL']),
    status: 'completed',
    elapsedMs: 468_000,
    finishedMs: 468_000,
    bestMs: 400_000,
    completedAt: '2026-10-14T12:10:00.000Z',
  })

describe('modo leitura', () => {
  it('uma cruzada já concluída abre em modo leitura, sem janela e sem teclado de jogo', async () => {
    openGame({ [PROGRESS]: () => jsonResponse(200, { progress: completed() }) })
    await screen.findByRole('grid')
    expect(screen.getByText('Concluída em 07:48')).toBeInTheDocument()
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    expect(screen.getByRole('grid')).toHaveAttribute('aria-readonly', 'true')
    expect(screen.queryByRole('button', { name: /Revelar letra/ })).not.toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Jogar de novo' })).toBeInTheDocument()
  })

  it('no modo leitura todas as dicas aparecem riscadas (feature 016)', async () => {
    openGame({ [PROGRESS]: () => jsonResponse(200, { progress: completed() }) })
    await screen.findByRole('grid')
    for (const name of ['Horizontais', 'Verticais']) {
      const clues = within(screen.getByRole('region', { name })).getAllByRole('button')
      expect(clues.length).toBeGreaterThan(0)
      for (const clue of clues) expect(clue).toHaveAccessibleName(/, resolvida$/)
    }
  })

  it('"Jogar de novo" reinicia no servidor e volta a jogar com a grade vazia', async () => {
    const user = setup()
    const { calls } = openGame({
      [PROGRESS]: () => jsonResponse(200, { progress: completed() }),
      [RESET]: () =>
        jsonResponse(200, {
          progress: makeProgress({ bestMs: 400_000, bestAt: '2026-10-14T12:10:00.000Z' }),
        }),
    })
    await screen.findByRole('grid')
    await user.click(screen.getByRole('button', { name: 'Jogar de novo' }))
    await waitFor(() => expect(screen.queryByText(/Concluída em/)).not.toBeInTheDocument())
    expect(calls.map((call) => call.key)).toContain(RESET)
    expect(screen.getByRole('grid')).not.toHaveAttribute('aria-readonly', 'true')
    expect(screen.getByRole('gridcell', { name: 'Linha 1, coluna 1, vazia' })).toBeInTheDocument()
    expect(screen.getByText('0/4 Letra')).toBeInTheDocument()
  })

  it('falha do reinício mantém o modo leitura e avisa', async () => {
    const user = setup()
    openGame({
      [PROGRESS]: () => jsonResponse(200, { progress: completed() }),
      [RESET]: () => apiError(500, 'internal-error'),
    })
    await screen.findByRole('grid')
    await user.click(screen.getByRole('button', { name: 'Jogar de novo' }))
    expect(
      await screen.findByText('Não foi possível reiniciar. Tente de novo.'),
    ).toBeInTheDocument()
    expect(screen.getByText('Concluída em 07:48')).toBeInTheDocument()
  })

  it('sem conexão mostra "Sem conexão. Tente de novo quando voltar." e mantém o modo leitura', async () => {
    const user = setup()
    openGame({
      [PROGRESS]: () => jsonResponse(200, { progress: completed() }),
      [RESET]: () => {
        throw new TypeError('Failed to fetch')
      },
    })
    await screen.findByRole('grid')
    await user.click(screen.getByRole('button', { name: 'Jogar de novo' }))
    expect(await screen.findByText('Sem conexão. Tente de novo quando voltar.')).toBeInTheDocument()
    expect(screen.getByText('Concluída em 07:48')).toBeInTheDocument()
  })
})
