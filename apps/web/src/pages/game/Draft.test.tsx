import { act, cleanup, screen, waitFor } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { loadDraft } from '../../features/offline'
import { guestStore } from '../../features/guest/services/guest-store'
import { expectNoA11yViolations } from '../../test/axe'
import { PUZZLE_ID } from '../../test/fixtures'
import {
  installGameTestLifecycle,
  openGame,
  openGuestGame,
  SAVE,
  chooseHelp,
  helpItem,
  setup,
} from '../../test/game-harness'
import { aUser } from '../../test/render'

installGameTestLifecycle()

async function reopen(open: () => unknown) {
  cleanup()
  await act(async () => {
    await vi.advanceTimersByTimeAsync(50)
  })
  open()
  await screen.findByRole('grid')
}

describe('rascunho no jogo (feature 043)', () => {
  it('visitante: o rascunho sobrevive ao recarregar, mesmo sem letra definitiva, e não conta', async () => {
    const user = setup()
    openGuestGame()
    await screen.findByRole('grid')
    await chooseHelp(user, 'Lápis')
    await user.click(screen.getByRole('grid'))
    await user.keyboard('CA')
    await waitFor(async () =>
      expect((await guestStore.get(PUZZLE_ID))?.cells[0]).toEqual([null, null, null]),
    )
    expect(loadDraft('guest', PUZZLE_ID)?.[0]).toEqual(['C', 'A', null])

    await reopen(() => openGuestGame())
    expect(await helpItem(user, 'Lápis')).toHaveAttribute('aria-checked', 'true')
    expect(screen.getByRole('gridcell', { name: /Linha 1, coluna 1, rascunho C/ })).toBeVisible()
    expect(screen.getByRole('gridcell', { name: /Linha 1, coluna 2, rascunho A/ })).toBeVisible()
    await expectNoA11yViolations(screen.getByRole('toolbar').parentElement as HTMLElement)
  })

  it('conta: o rascunho volta ao recarregar e nunca vai no corpo do salvamento', async () => {
    const user = setup()
    const { calls } = openGame()
    await screen.findByRole('grid')
    await chooseHelp(user, 'Lápis')
    await user.click(screen.getByRole('grid'))
    await user.keyboard('CA')
    expect(loadDraft(aUser.id, PUZZLE_ID)?.[0]).toEqual(['C', 'A', null])
    await chooseHelp(user, 'Lápis')
    await user.click(screen.getByRole('gridcell', { name: /Linha 1, coluna 3/ }))
    await user.keyboard('L')
    await act(async () => {
      await vi.advanceTimersByTimeAsync(5000)
    })
    for (const call of calls.filter((c) => c.key === SAVE)) {
      expect(JSON.stringify(call.body)).not.toContain('"draft"')
      expect((call.body as { cells: unknown }).cells).toEqual([
        [null, null, 'L'],
        [null, null, null],
        [null, null, null],
      ])
    }

    await reopen(() => openGame())
    expect(screen.getByRole('gridcell', { name: /Linha 1, coluna 1, rascunho C/ })).toBeVisible()
  })

  it('confirmar vira letra normal; reiniciar e concluir não deixam chave de rascunho', async () => {
    const user = setup()
    openGuestGame()
    await screen.findByRole('grid')
    await chooseHelp(user, 'Lápis')
    await user.click(screen.getByRole('grid'))
    await user.keyboard('CAL')
    await chooseHelp(user, 'Confirmar rascunho')
    expect(screen.getByRole('gridcell', { name: /Linha 1, coluna 1, letra C/ })).toBeVisible()
    expect(loadDraft('guest', PUZZLE_ID)).toBeNull()
  })

  it('visitante sem registro: o rascunho órfão é apagado ao abrir', async () => {
    window.localStorage.setItem(
      `cruzadinha:draft:guest:${PUZZLE_ID}`,
      JSON.stringify({
        v: 1,
        cells: [
          ['C', null, null],
          [null, null, null],
          [null, null, null],
        ],
      }),
    )
    openGuestGame()
    await screen.findByRole('grid')
    expect(screen.getByRole('gridcell', { name: /Linha 1, coluna 1, vazia/ })).toBeVisible()
    await waitFor(() => expect(loadDraft('guest', PUZZLE_ID)).toBeNull())
  })

  it('digitar com o lápis não inicia nem muda o relógio', async () => {
    const user = setup()
    openGuestGame()
    await screen.findByRole('grid')
    const before = screen.getByRole('timer', { hidden: true }).textContent
    await chooseHelp(user, 'Lápis')
    await user.click(screen.getByRole('grid'))
    await user.keyboard('C')
    expect(screen.getByRole('timer', { hidden: true }).textContent).toBe(before)
  })
})
