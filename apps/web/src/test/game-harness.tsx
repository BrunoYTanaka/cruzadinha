import { act, cleanup, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, vi } from 'vitest'
import { queryKeys } from '../shared/services/api/query-keys/query-keys'
import { clearExpired } from '../features/session/services/session-expired'
import { GamePage } from '../pages/game/GamePage'
import { makeProgress, makePuzzleResponse, PUZZLE_ID, TINY } from './fixtures'
import { jsonResponse, mockApi } from './http'
import { aUser, makeQueryClient, renderRoutes, resetSessionHandlers } from './render'

export const routes = [
  { path: '/jogo/:puzzleId', element: <GamePage /> },
  { path: '/', element: <p>Biblioteca</p> },
]

export const PUZZLE = `GET /api/puzzles/${PUZZLE_ID}`
export const PROGRESS = `GET /api/progress/${PUZZLE_ID}`
export const SAVE = `PUT /api/progress/${PUZZLE_ID}`
export const RESET = `POST /api/progress/${PUZZLE_ID}/reset`

export function openGame(
  handlers: Parameters<typeof mockApi>[0] = {},
  options: { strict?: boolean } = {},
) {
  const api = mockApi({
    [PUZZLE]: () => jsonResponse(200, makePuzzleResponse(TINY)),
    [PROGRESS]: () => jsonResponse(200, { progress: null }),
    [SAVE]: () => jsonResponse(200, { progress: makeProgress() }),
    ...handlers,
  })
  const queryClient = makeQueryClient()
  queryClient.setQueryData(queryKeys.session, { user: aUser })
  const view = renderRoutes(routes, [`/jogo/${PUZZLE_ID}`], queryClient, options)
  return { ...api, ...view }
}

// Mesma tela, sem sessão: o visitante joga com o progresso no navegador (feature 013). Só a rota do
// puzzle responde; qualquer pedido a /api/progress cai no 404 do mock e aparece em `calls`.
export function openGuestGame(handlers: Parameters<typeof mockApi>[0] = {}) {
  const api = mockApi({
    [PUZZLE]: () => jsonResponse(200, makePuzzleResponse(TINY)),
    ...handlers,
  })
  const queryClient = makeQueryClient()
  queryClient.setQueryData(queryKeys.session, null)
  const view = renderRoutes(routes, [`/jogo/${PUZZLE_ID}`], queryClient)
  return { ...api, ...view }
}

export function setup() {
  return userEvent.setup({ advanceTimers: vi.advanceTimersByTime })
}

// Relógio falso e limpeza que deixa terminar o envio feito ao desmontar a tela, para ele não
// vazar para o teste seguinte.
export function installGameTestLifecycle() {
  beforeEach(() => {
    vi.useFakeTimers({ shouldAdvanceTime: true })
  })
  afterEach(async () => {
    cleanup()
    await act(async () => {
      await vi.advanceTimersByTimeAsync(50)
    })
    vi.useRealTimers()
    window.localStorage.clear()
    clearExpired()
    resetSessionHandlers()
  })
}

// Menu "Ajudas" (feature 047): abre se estiver fechado e devolve o item pelo nome.
export async function helpItem(user: ReturnType<typeof setup>, name: string) {
  const button = screen.getByRole('button', { name: /^Ajudas/ })
  if (button.getAttribute('aria-expanded') !== 'true') await user.click(button)
  return screen.queryByRole('menuitem', { name }) ?? screen.getByRole('menuitemcheckbox', { name })
}

export async function chooseHelp(user: ReturnType<typeof setup>, name: string) {
  await user.click(await helpItem(user, name))
}
