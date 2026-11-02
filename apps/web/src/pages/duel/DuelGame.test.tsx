import { act, screen, waitFor, within } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { DUEL_ID, finishedResult, LINK, makeDuelView } from '../../test/duel-fixtures'
import { makePuzzleResponse, PUZZLE_ID, TINY } from '../../test/fixtures'
import { installGameTestLifecycle, setup } from '../../test/game-harness'
import { jsonResponse, mockApi } from '../../test/http'
import { aUser, makeQueryClient, renderRoutes } from '../../test/render'
import { queryKeys } from '../../shared/services/api/query-keys/query-keys'
import { duelGameStore } from '../../features/duel/services/duel-progress'
import { guestStore } from '../../features/guest/services/guest-store'
import { DuelPage } from './DuelPage'

installGameTestLifecycle()

const STATE = 'POST /api/duels/state'
const FINISH = 'POST /api/duels/finish'
const FORFEIT = 'POST /api/duels/forfeit'
const PUZZLE = `GET /api/puzzles/${PUZZLE_ID}`

const routes = [{ path: '/x1/:linkToken', element: <DuelPage /> }]

// Duelo em andamento: o servidor diz que a partida começou 90 s antes de "agora".
function playing(rules: Partial<ReturnType<typeof makeDuelView>['rules']> = {}) {
  const now = new Date()
  const startedAt = new Date(now.getTime() - 90_000).toISOString()
  return {
    duel: makeDuelView({
      status: 'running',
      myStatus: 'playing',
      opponentStatus: 'playing',
      opponentNickname: 'Beto',
      me: { nickname: 'Ana', startedAt },
      rules: { ...makeDuelView().rules, ...rules },
    }),
    puzzleId: PUZZLE_ID,
    serverNow: now.toISOString(),
  }
}

function openDuel(handlers: Parameters<typeof mockApi>[0], payload = playing()) {
  const api = mockApi({
    [STATE]: () => jsonResponse(200, payload),
    [PUZZLE]: () => jsonResponse(200, makePuzzleResponse(TINY)),
    ...handlers,
  })
  const queryClient = makeQueryClient()
  queryClient.setQueryData(queryKeys.session, { user: aUser })
  const view = renderRoutes(routes, [`/x1/${LINK}`], queryClient)
  return { ...api, ...view }
}

async function fillGrid(user: ReturnType<typeof setup>) {
  await user.click(screen.getByRole('grid'))
  await user.keyboard('CAL{ArrowDown}OL')
  await user.click(screen.getByRole('gridcell', { name: 'Linha 2, coluna 1, vazia' }))
  await user.keyboard('AS{ArrowRight}O')
}

describe('partida do duelo (feature 058)', () => {
  it('abre o tabuleiro com o relógio do servidor, sem pausa nem impressão', async () => {
    openDuel({})
    await screen.findByRole('grid')
    expect(screen.getByText('01:30')).toBeVisible()
    expect(screen.getByRole('button', { name: 'Desistir' })).toBeVisible()
    expect(screen.queryByRole('button', { name: /Pausar/ })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /Imprimir/ })).not.toBeInTheDocument()
  })

  it('guarda as letras só no lugar do duelo, nunca no jogo normal nem no servidor', async () => {
    const user = setup()
    const { calls } = openDuel({})
    await screen.findByRole('grid')
    await user.click(screen.getByRole('grid'))
    await user.keyboard('CA')
    await waitFor(async () =>
      expect((await duelGameStore.get(DUEL_ID))?.cells[0]).toEqual(['C', 'A', null]),
    )
    expect(await guestStore.get(PUZZLE_ID)).toBeNull()
    expect(calls.some((call) => call.key.includes('/api/progress'))).toBe(false)
  })

  it('o relógio não reinicia ao recarregar a tela', async () => {
    const payload = playing()
    const first = openDuel({}, payload)
    await screen.findByRole('grid')
    first.unmount()
    openDuel({}, payload)
    await screen.findByRole('grid')
    expect(screen.getByText(/^01:3\d$/)).toBeVisible()
  })

  it('ao completar a grade envia a conclusão e mostra o resultado', async () => {
    const user = setup()
    let finished = false
    const { calls } = openDuel({
      [STATE]: () =>
        jsonResponse(
          200,
          finished
            ? {
                duel: makeDuelView({
                  status: 'finished',
                  myStatus: 'done',
                  opponentNickname: 'Beto',
                  result: finishedResult('won'),
                }),
                serverNow: new Date().toISOString(),
              }
            : playing(),
        ),
      [FINISH]: () => {
        finished = true
        return jsonResponse(200, { duel: makeDuelView({ status: 'finished', myStatus: 'done' }) })
      },
    })
    await screen.findByRole('grid')
    await fillGrid(user)
    expect(await screen.findByRole('heading', { name: 'Você venceu!' })).toBeVisible()
    expect(calls.find((call) => call.key === FINISH)?.body).toEqual({
      linkToken: LINK,
      helpsUsed: 0,
    })
    // O jogo do duelo some do aparelho quando o duelo termina.
    await waitFor(async () => expect(await duelGameStore.get(DUEL_ID)).toBeNull())
  })

  it('sem ajudas: os botões de letra e palavra ficam desligados e verificar some do menu', async () => {
    const user = setup()
    openDuel({}, playing({ helpMode: 'forbidden' }))
    await screen.findByRole('grid')
    expect(screen.getByRole('button', { name: /Revelar letra/ })).toHaveAttribute(
      'aria-disabled',
      'true',
    )
    await user.click(screen.getByRole('button', { name: /^Ajudas/ }))
    expect(screen.queryByRole('menuitem', { name: 'Verificar' })).not.toBeInTheDocument()
    expect(screen.getByRole('menuitemcheckbox', { name: 'Lápis' })).toBeVisible()
  })

  it('desistir pede confirmação e só então envia', async () => {
    const user = setup()
    const { calls } = openDuel({
      [FORFEIT]: () =>
        jsonResponse(200, {
          duel: makeDuelView({
            status: 'finished',
            myStatus: 'done',
            result: finishedResult('lost'),
          }),
        }),
    })
    await screen.findByRole('grid')
    await user.click(screen.getByRole('button', { name: 'Desistir' }))
    expect(screen.getByRole('dialog', { name: 'Desistir deste x1?' })).toHaveTextContent(
      'não pode ser desfeito',
    )
    expect(calls.some((call) => call.key === FORFEIT)).toBe(false)
    await user.click(within(screen.getByRole('dialog')).getByRole('button', { name: 'Desistir' }))
    await waitFor(() => expect(calls.some((call) => call.key === FORFEIT)).toBe(true))
    await act(async () => {})
  })
})
