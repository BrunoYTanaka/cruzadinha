import { act, cleanup, screen, waitFor, within } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { queryKeys } from '../../shared/services/api/query-keys'
import { expectNoA11yViolations } from '../../test/axe'
import { cellsFrom, makeProgress, PUZZLE_ID } from '../../test/fixtures'
import {
  installGameTestLifecycle,
  openGame,
  openGuestGame,
  PROGRESS,
  SAVE,
  setup,
} from '../../test/game-harness'
import { jsonResponse } from '../../test/http'
import { aUser } from '../../test/render'
import { guestStore } from '../../features/guest/services/guest-store'

installGameTestLifecycle()

const toProgress = (key: string) =>
  key.startsWith('GET /api/progress') ||
  key.startsWith('PUT /api/progress') ||
  key.startsWith('POST /api/progress')

async function stored() {
  return guestStore.get(PUZZLE_ID)
}

// Preenche CAL / A#O / SOL; `first` é a primeira letra (use outra para uma grade errada).
async function fillGrid(user: ReturnType<typeof setup>, first = 'C') {
  await user.click(screen.getByRole('grid'))
  await user.keyboard(`${first}AL{ArrowDown}OL`)
  await user.click(screen.getByRole('gridcell', { name: 'Linha 2, coluna 1, vazia' }))
  await user.keyboard('AS{ArrowRight}O')
}

describe('jogo do visitante (feature 013, US1)', () => {
  it('abre só com o puzzle, sem pedir progresso ao servidor', async () => {
    const { calls } = openGuestGame()
    await screen.findByRole('grid')
    expect(calls.some((call) => toProgress(call.key))).toBe(false)
  })

  it('grava as letras no navegador e nunca no servidor', async () => {
    const user = setup()
    const { calls } = openGuestGame()
    await screen.findByRole('grid')
    await user.click(screen.getByRole('grid'))
    await user.keyboard('CA')
    await waitFor(async () => expect((await stored())?.cells[0]).toEqual(['C', 'A', null]))
    expect(calls.some((call) => toProgress(call.key))).toBe(false)
  })

  it('ao reabrir restaura letras, tempo e a ajuda usada', async () => {
    const user = setup()
    openGuestGame()
    await screen.findByRole('grid')
    await user.click(screen.getByRole('grid'))
    await user.keyboard('C')
    await user.click(screen.getByRole('button', { name: /Revelar letra/ }))
    await waitFor(async () => expect((await stored())?.help?.usage.letters).toBe(1))
    cleanup()
    await act(async () => {
      await vi.advanceTimersByTimeAsync(50)
    })

    openGuestGame()
    await screen.findByRole('grid')
    expect(screen.getByRole('gridcell', { name: /Linha 1, coluna 1, letra C/ })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /Revelar letra/ })).toHaveTextContent('1/4')
  })

  it('ao reabrir, só a palavra certa aparece riscada, sem pedir nada a mais (feature 016)', async () => {
    const user = setup()
    openGuestGame()
    await screen.findByRole('grid')
    await user.click(screen.getByRole('grid'))
    // 1 horizontal certa (CAL); 1 vertical completa e errada (C, A, X).
    await user.keyboard('CAL')
    await user.click(screen.getByRole('gridcell', { name: 'Linha 2, coluna 1, vazia' }))
    await user.keyboard('A')
    await user.click(screen.getByRole('gridcell', { name: 'Linha 3, coluna 1, vazia' }))
    await user.keyboard('X')
    await waitFor(async () => expect((await stored())?.cells[2]?.[0]).toBe('X'))
    cleanup()
    await act(async () => {
      await vi.advanceTimersByTimeAsync(50)
    })

    const { calls } = openGuestGame()
    await screen.findByRole('grid')
    expect(
      screen.getByRole('button', { name: /^1 ?Dica 1 horizontal, resolvida$/ }),
    ).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /^1 ?Dica 1 vertical$/ })).toBeInTheDocument()
    expect(calls.map((call) => call.key)).toEqual([`GET /api/puzzles/${PUZZLE_ID}`])
  })

  it('uma verificação que só marca células também fica guardada (FR-004)', async () => {
    const user = setup()
    openGuestGame()
    await screen.findByRole('grid')
    await user.click(screen.getByRole('grid'))
    await user.keyboard('X')
    await waitFor(async () => expect((await stored())?.cells[0]?.[0]).toBe('X'))
    await user.click(screen.getByRole('button', { name: 'Verificar' }))
    await waitFor(async () => expect((await stored())?.help?.marks['0,0']).toBe('wrong'))
  })

  it('mostra que o progresso fica só neste aparelho, o link para entrar e a fonte', async () => {
    const { container } = openGuestGame()
    await screen.findByRole('grid')
    expect(screen.getByText('Progresso só neste aparelho')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Entrar para salvar na sua conta' })).toHaveAttribute(
      'href',
      `/login?next=${encodeURIComponent(`/jogo/${PUZZLE_ID}`)}`,
    )
    expect(screen.getAllByText(/Fonte: O Globo/).length).toBeGreaterThan(0)
    await expectNoA11yViolations(container)
  })

  it('o texto do visitante não muda ao salvar (feature 017)', async () => {
    const user = setup()
    openGuestGame()
    await screen.findByRole('grid')
    await user.click(screen.getByRole('grid'))
    await user.keyboard('X')
    await waitFor(async () => expect((await stored())?.cells[0]?.[0]).toBe('X'))
    expect(screen.getByText('Progresso só neste aparelho')).toBeInTheDocument()
    expect(screen.queryByText('Salvo neste aparelho')).toBeNull()
  })

  it('sem armazenamento no navegador avisa, sem cobrir o tabuleiro, e o jogo segue', async () => {
    const original = globalThis.indexedDB
    vi.stubGlobal('indexedDB', undefined)
    try {
      const user = setup()
      openGuestGame()
      await screen.findByRole('grid')
      expect(
        await screen.findByText(/Seu navegador não deixou guardar o progresso/),
      ).toBeInTheDocument()
      await user.click(screen.getByRole('grid'))
      await user.keyboard('C')
      expect(screen.getByRole('gridcell', { name: /letra C/ })).toBeInTheDocument()
    } finally {
      vi.stubGlobal('indexedDB', original)
    }
  })
})

describe('conclusão do visitante (feature 013, US2)', () => {
  it('a janela abre na hora com o tempo e o recorde do aparelho, sem "Vamos registrar", também sem rede', async () => {
    vi.spyOn(navigator, 'onLine', 'get').mockReturnValue(false)
    const user = setup()
    const { calls } = openGuestGame()
    await screen.findByRole('grid')
    await fillGrid(user)
    await user.keyboard('{ArrowDown}A{ArrowDown}SOL')
    const dialog = await screen.findByRole('dialog', { name: 'Cruzada concluída' })
    expect(within(dialog).queryByText(/Vamos registrar/)).not.toBeInTheDocument()
    await waitFor(() => expect(within(dialog).queryByText('—')).not.toBeInTheDocument())
    expect((await stored())?.status).toBe('completed')
    expect(calls.some((call) => toProgress(call.key))).toBe(false)
  })

  it('reabrir uma concluída abre em modo leitura; "Jogar de novo" reinicia sem rede e mantém o recorde', async () => {
    await guestStore.save({
      puzzleId: PUZZLE_ID,
      date: '2026-10-14',
      cells: cellsFrom(['CAL', 'A#O', 'SOL']),
      elapsedMs: 12_000,
      status: 'completed',
      savedAt: new Date().toISOString(),
      help: null,
    })
    const user = setup()
    const { calls } = openGuestGame()
    expect(await screen.findByRole('button', { name: 'Jogar de novo' })).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Jogar de novo' }))
    await waitFor(() =>
      expect(
        screen.getByRole('gridcell', { name: 'Linha 1, coluna 1, vazia' }),
      ).toBeInTheDocument(),
    )
    const record = await stored()
    expect(record).toMatchObject({ status: 'in_progress', bestMs: 12_000, finishedMs: null })
    // O relógio volta do zero (pode já ter contado alguns milissegundos).
    expect(record?.elapsedMs).toBeLessThan(1_000)
    expect(calls.some((call) => toProgress(call.key))).toBe(false)
  })
})

describe('visitante e conta não se misturam (feature 013, US5)', () => {
  it('entrar mostra o progresso da conta e nada do visitante vai ao servidor', async () => {
    const user = setup()
    const guest = openGuestGame()
    await screen.findByRole('grid')
    await user.click(screen.getByRole('grid'))
    await user.keyboard('X')
    await waitFor(async () => expect((await stored())?.cells[0]?.[0]).toBe('X'))
    guest.unmount()

    const account = openGame({
      [PROGRESS]: () =>
        jsonResponse(200, { progress: makeProgress({ cells: cellsFrom(['C..', '.#.', '...']) }) }),
    })
    await screen.findByRole('grid')
    expect(screen.getByRole('gridcell', { name: 'Linha 1, coluna 1, letra C' })).toBeInTheDocument()
    await act(async () => {
      await vi.advanceTimersByTimeAsync(3_000)
    })
    const sentX = account.calls.some(
      (call) => call.key === SAVE && JSON.stringify(call.body).includes('"X"'),
    )
    expect(sentX).toBe(false)
    expect((await stored())?.cells[0]?.[0]).toBe('X')
  })

  it('a troca de visitante para conta na mesma tela remonta o jogo com o progresso da conta', async () => {
    const user = setup()
    const { queryClient, calls } = openGuestGame({
      [PROGRESS]: () =>
        jsonResponse(200, { progress: makeProgress({ cells: cellsFrom(['S..', '.#.', '...']) }) }),
      [SAVE]: () => jsonResponse(200, { progress: makeProgress() }),
    })
    await screen.findByRole('grid')
    await user.click(screen.getByRole('grid'))
    await user.keyboard('X')
    await waitFor(async () => expect((await stored())?.cells[0]?.[0]).toBe('X'))

    act(() => queryClient.setQueryData(queryKeys.session, { user: aUser }))
    expect(
      await screen.findByRole('gridcell', { name: 'Linha 1, coluna 1, letra S' }),
    ).toBeInTheDocument()
    expect(calls.some((call) => call.key === PROGRESS)).toBe(true)

    act(() => queryClient.setQueryData(queryKeys.session, null))
    expect(
      await screen.findByRole('gridcell', { name: 'Linha 1, coluna 1, letra X' }),
    ).toBeInTheDocument()
  })
})
