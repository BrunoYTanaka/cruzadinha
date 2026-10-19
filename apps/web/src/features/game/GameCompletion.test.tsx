import { act, screen, waitFor, within } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { cellsFrom, makeLibraryItem, makeProgress } from '../../test/fixtures'
import { openGame, PROGRESS, SAVE, setup, installGameTestLifecycle } from '../../test/game-harness'
import { apiError, jsonResponse } from '../../test/http'

installGameTestLifecycle()

const doneProgress = (overrides = {}) =>
  makeProgress({
    cells: cellsFrom(['CAL', 'A#O', 'SOL']),
    status: 'completed',
    elapsedMs: 12_000,
    finishedMs: 12_000,
    bestMs: 12_000,
    completedAt: '2026-10-14T12:10:00.000Z',
    ...overrides,
  })

// Preenche CAL / A#O / SOL; `first` é a primeira letra (use outra para uma grade errada).
async function fillGrid(user: ReturnType<typeof setup>, first = 'C') {
  await user.click(screen.getByRole('grid'))
  await user.keyboard(`${first}AL{ArrowDown}OL`)
  await user.click(screen.getByRole('gridcell', { name: 'Linha 2, coluna 1, vazia' }))
  await user.keyboard('AS{ArrowRight}O')
}

describe('conclusão', () => {
  it('grade certa abre a janela na hora e envia status "completed"', async () => {
    const user = setup()
    const { calls } = openGame({ [SAVE]: () => jsonResponse(200, { progress: doneProgress() }) })
    await screen.findByRole('grid')
    await fillGrid(user)
    // CAL: o cursor segue pela palavra; as demais letras vêm pelas verticais.
    await user.keyboard('{ArrowDown}A{ArrowDown}SOL')
    expect(await screen.findByRole('dialog', { name: 'Cruzada concluída' })).toBeInTheDocument()
    await waitFor(() => {
      const saves = calls.filter((call) => call.key === SAVE)
      expect(saves.at(-1)?.body).toMatchObject({ status: 'completed' })
    })
    // Confirmado: o melhor tempo aparece e o aviso some.
    const dialog = screen.getByRole('dialog')
    await waitFor(() => expect(within(dialog).queryByText('—')).not.toBeInTheDocument())
    expect(within(dialog).queryByText(/Vamos registrar/)).not.toBeInTheDocument()
  })

  it('sem rede, a janela abre com "—" e o aviso; ao voltar a rede mostra o melhor tempo', async () => {
    const user = setup()
    let online = false
    openGame({
      [SAVE]: (request) => {
        if (!online) throw new TypeError('Failed to fetch')
        return jsonResponse(200, {
          progress:
            (request.body as { status?: string } | undefined)?.status === 'completed'
              ? doneProgress()
              : makeProgress(),
        })
      },
    })
    await screen.findByRole('grid')
    await fillGrid(user)
    const dialog = await screen.findByRole('dialog', { name: 'Cruzada concluída' })
    expect(within(dialog).getByText('—')).toBeInTheDocument()
    expect(within(dialog).getByText('Vamos registrar quando a conexão voltar.')).toBeInTheDocument()
    expect(screen.getByRole('grid')).toHaveAttribute('aria-readonly', 'true')
    online = true
    await act(async () => {
      await vi.advanceTimersByTimeAsync(31_000)
    })
    await waitFor(() => expect(within(dialog).queryByText('—')).not.toBeInTheDocument())
    expect(within(dialog).getAllByText('00:12')).toHaveLength(2)
  })

  it('grade completa e errada não faz nada', async () => {
    const user = setup()
    openGame()
    await screen.findByRole('grid')
    await fillGrid(user, 'X')
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    expect(screen.getByRole('grid')).not.toHaveAttribute('aria-readonly', 'true')
  })

  it('"Ver o tabuleiro" fecha a janela e deixa o tabuleiro em modo leitura', async () => {
    const user = setup()
    openGame({ [SAVE]: () => jsonResponse(200, { progress: doneProgress() }) })
    await screen.findByRole('grid')
    await fillGrid(user)
    await screen.findByRole('dialog')
    await user.click(screen.getByRole('button', { name: 'Ver o tabuleiro' }))
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Jogar de novo' })).toBeInTheDocument()
  })

  it('reabrir uma cruzada já concluída não abre a janela', async () => {
    openGame({ [PROGRESS]: () => jsonResponse(200, { progress: doneProgress() }) })
    await screen.findByRole('grid')
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  })
})

describe('atalho para a outra fonte do dia (feature 015)', () => {
  const LIBRARY = 'GET /api/library'
  const sameDay = (status: 'not_started' | 'completed') =>
    makeLibraryItem('2026-10-14', {
      puzzleId: '00000000-0000-4000-8000-00000000c014',
      source: 'cruzadaonline',
      status,
    })
  const bySource =
    (online: ReturnType<typeof makeLibraryItem>[]) =>
    ({ url }: { url: string }) =>
      jsonResponse(200, {
        items:
          new URL(url, 'http://x').searchParams.get('source') === 'cruzadaonline' ? online : [],
      })

  async function complete(user: ReturnType<typeof setup>) {
    await screen.findByRole('grid')
    await fillGrid(user)
    await user.keyboard('{ArrowDown}A{ArrowDown}SOL')
    return screen.findByRole('dialog', { name: 'Cruzada concluída' })
  }

  it('a biblioteca só é pedida ao concluir; a outra fonte não concluída vira atalho', async () => {
    const user = setup()
    const { calls } = openGame({
      [SAVE]: () => jsonResponse(200, { progress: doneProgress() }),
      [LIBRARY]: bySource([sameDay('not_started')]),
    })
    await screen.findByRole('grid')
    expect(calls.some((call) => call.key === LIBRARY)).toBe(false)
    await complete(user)
    expect(
      await screen.findByRole('link', { name: 'Jogar Cruzada Online deste dia' }),
    ).toHaveAttribute('href', '/jogo/00000000-0000-4000-8000-00000000c014')
  })

  it('outra fonte já concluída não gera atalho', async () => {
    const user = setup()
    const { calls } = openGame({
      [SAVE]: () => jsonResponse(200, { progress: doneProgress() }),
      [LIBRARY]: bySource([sameDay('completed')]),
    })
    await complete(user)
    await waitFor(() => expect(calls.some((call) => call.key === LIBRARY)).toBe(true))
    await act(async () => {
      await vi.advanceTimersByTimeAsync(50)
    })
    expect(screen.queryByRole('link', { name: /deste dia/ })).not.toBeInTheDocument()
  })

  it('biblioteca com erro: o diálogo aparece sem atalho e o tabuleiro segue', async () => {
    const user = setup()
    openGame({
      [SAVE]: () => jsonResponse(200, { progress: doneProgress() }),
      [LIBRARY]: () => apiError(500, 'internal-error'),
    })
    const dialog = await complete(user)
    await act(async () => {
      await vi.advanceTimersByTimeAsync(50)
    })
    expect(within(dialog).queryByRole('link', { name: /deste dia/ })).not.toBeInTheDocument()
    expect(screen.queryByRole('alert')).not.toBeInTheDocument()
    expect(screen.getByRole('grid')).toBeInTheDocument()
  })
})
