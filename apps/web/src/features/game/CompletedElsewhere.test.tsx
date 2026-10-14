import { screen, waitFor } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { cellsFrom, makeProgress } from '../../test/fixtures'
import { openGame, PROGRESS, SAVE, setup, installGameTestLifecycle } from '../../test/game-harness'
import { apiError, jsonResponse } from '../../test/http'

installGameTestLifecycle()

describe('concluída em outro aparelho', () => {
  it('409 avisa sem tirar a pessoa do jogo; "Ver como ficou" abre o modo leitura', async () => {
    const user = setup()
    let progressCalls = 0
    const { calls } = openGame({
      [SAVE]: () => apiError(409, 'progress-completed'),
      [PROGRESS]: () => {
        progressCalls += 1
        return jsonResponse(200, {
          progress:
            progressCalls === 1
              ? null
              : makeProgress({
                  cells: cellsFrom(['CAL', 'A#O', 'SOL']),
                  status: 'completed',
                  finishedMs: 30_000,
                  elapsedMs: 30_000,
                  bestMs: 30_000,
                }),
        })
      },
    })
    await screen.findByRole('grid')
    await user.click(screen.getByRole('grid'))
    await user.keyboard('C')
    const notice = await screen.findByText(
      'Esta cruzada já foi concluída em outro aparelho.',
      {},
      { timeout: 4000 },
    )
    expect(notice).toBeInTheDocument()
    // O jogo continua editável e nada muda sozinho.
    expect(screen.getByRole('grid')).not.toHaveAttribute('aria-readonly', 'true')
    await user.keyboard('A')
    expect(screen.getByRole('gridcell', { name: /coluna 2, letra A/ })).toBeInTheDocument()
    const saves = calls.filter((call) => call.key === SAVE).length
    expect(saves).toBeGreaterThan(0)

    await user.click(screen.getByRole('button', { name: 'Ver como ficou' }))
    await waitFor(() => expect(screen.getByRole('grid')).toHaveAttribute('aria-readonly', 'true'))
    expect(screen.getByText('Concluída em 00:30')).toBeInTheDocument()
  })
})
