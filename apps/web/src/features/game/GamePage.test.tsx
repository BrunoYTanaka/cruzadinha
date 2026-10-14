import { act, cleanup, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { queryKeys } from '../../api/query-keys'
import { clearExpired } from '../../app/session-expired'
import { cellsFrom, makeProgress, makePuzzleResponse, PUZZLE_ID, TINY } from '../../test/fixtures'
import { apiError, jsonResponse, mockApi } from '../../test/http'
import { aUser, makeQueryClient, renderRoutes, resetSessionHandlers } from '../../test/render'
import { GamePage } from './GamePage'

const routes = [
  { path: '/jogo/:puzzleId', element: <GamePage /> },
  { path: '/', element: <p>Biblioteca</p> },
]

const PUZZLE = `GET /api/puzzles/${PUZZLE_ID}`
const PROGRESS = `GET /api/progress/${PUZZLE_ID}`
const SAVE = `PUT /api/progress/${PUZZLE_ID}`

function openGame(
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

const grid = () => screen.getByRole('grid')

beforeEach(() => {
  vi.useFakeTimers({ shouldAdvanceTime: true })
})

afterEach(async () => {
  // Desmontar a tela envia o que faltava; deixa esse envio terminar antes de limpar o armazenamento
  // para ele não vazar para o teste seguinte.
  cleanup()
  await vi.advanceTimersByTimeAsync(50)
  vi.useRealTimers()
  window.localStorage.clear()
  clearExpired()
  resetSessionHandlers()
})

function setup() {
  return userEvent.setup({ advanceTimers: vi.advanceTimersByTime })
}

describe('GamePage', () => {
  it('carrega a cruzada e o progresso em paralelo e hidrata letras e tempo', async () => {
    const { calls } = openGame({
      [PROGRESS]: () =>
        jsonResponse(200, {
          progress: makeProgress({ cells: cellsFrom(['C..', '.#.', '...']), elapsedMs: 65_000 }),
        }),
    })
    await screen.findByRole('grid')
    const keys = calls.map((call) => call.key)
    expect(keys).toContain(PUZZLE)
    expect(keys).toContain(PROGRESS)
    expect(screen.getByRole('gridcell', { name: 'Linha 1, coluna 1, letra C' })).toBeInTheDocument()
    expect(screen.getByRole('timer')).toHaveTextContent(/^01:0[5-6]$/)
  })

  it('mostra a atribuição à fonte', async () => {
    openGame()
    await screen.findByRole('grid')
    expect(screen.getByText(/Fonte: O Globo/)).toBeInTheDocument()
  })

  it('mostra a dica ativa e a lista de dicas no computador', async () => {
    openGame()
    await screen.findByRole('grid')
    expect(screen.getAllByText('Dica 1 horizontal').length).toBeGreaterThan(0)
    expect(screen.getByRole('region', { name: 'Horizontais' })).toBeInTheDocument()
    expect(screen.getByRole('region', { name: 'Verticais' })).toBeInTheDocument()
  })

  it('404 mostra "Cruzada não encontrada." com volta à biblioteca', async () => {
    openGame({ [PUZZLE]: () => apiError(404, 'puzzle-unavailable') })
    expect(await screen.findByRole('alert')).toHaveTextContent('Cruzada não encontrada.')
    expect(screen.getByRole('link', { name: 'Voltar à biblioteca' })).toHaveAttribute('href', '/')
  })

  it('sem rede ao abrir mostra "Sem conexão" e permite tentar de novo', async () => {
    let online = false
    const user = setup()
    openGame({
      [PUZZLE]: () =>
        online ? jsonResponse(200, makePuzzleResponse(TINY)) : Promise.reject(new TypeError('x')),
    })
    expect(await screen.findByRole('alert')).toHaveTextContent('Sem conexão')
    online = true
    await user.click(screen.getByRole('button', { name: 'Tentar de novo' }))
    expect(await screen.findByRole('grid')).toBeInTheDocument()
  })

  it('salva ao digitar, depois de 1,5 s', async () => {
    const user = setup()
    const { calls } = openGame()
    await screen.findByRole('grid')
    await user.keyboard('C')
    expect(calls.filter((call) => call.key === SAVE)).toHaveLength(0)
    await act(() => vi.advanceTimersByTimeAsync(1600))
    const saves = calls.filter((call) => call.key === SAVE)
    expect(saves).toHaveLength(1)
    expect(saves[0]?.body).toMatchObject({
      status: 'in_progress',
      cells: cellsFrom(['C..', '.#.', '...']),
    })
    await waitFor(() => expect(screen.getByText('Salvo')).toBeInTheDocument())
  })

  it('salva também em StrictMode (monta, desmonta e monta de novo)', async () => {
    const user = setup()
    const { calls } = openGame({}, { strict: true })
    await screen.findByRole('grid')
    await user.keyboard('CA')
    await act(() => vi.advanceTimersByTimeAsync(1600))
    expect(calls.filter((call) => call.key === SAVE)).toHaveLength(1)
  })

  it('ao sair da tela de jogo envia na hora o que ainda esperava o debounce', async () => {
    const user = setup()
    const { calls } = openGame()
    await screen.findByRole('grid')
    await user.keyboard('CA')
    expect(calls.filter((call) => call.key === SAVE)).toHaveLength(0)
    await user.click(screen.getByRole('link', { name: 'Escolher outro dia' }))
    expect(await screen.findByText('Biblioteca')).toBeInTheDocument()
    await waitFor(() => expect(calls.filter((call) => call.key === SAVE)).toHaveLength(1))
    expect(calls.find((call) => call.key === SAVE)?.body).toMatchObject({
      cells: cellsFrom(['CA.', '.#.', '...']),
    })
  })

  it('"Pausar" cobre o tabuleiro e o torna inerte; "Continuar" devolve o jogo', async () => {
    const user = setup()
    openGame()
    await screen.findByRole('grid')
    await user.click(screen.getByRole('button', { name: 'Pausar' }))
    expect(screen.getByText('Jogo pausado')).toBeInTheDocument()
    expect(document.getElementById('board')?.closest('[inert]')).not.toBeNull()
    const cover = screen.getByText('Jogo pausado').parentElement as HTMLElement
    await user.click(within(cover).getByRole('button', { name: 'Continuar' }))
    expect(screen.queryByText('Jogo pausado')).not.toBeInTheDocument()
    expect(document.getElementById('board')?.closest('[inert]')).toBeNull()
  })

  it('o tempo para ao pausar', async () => {
    const user = setup()
    openGame()
    await screen.findByRole('grid')
    await act(() => vi.advanceTimersByTimeAsync(3000))
    await user.click(screen.getByRole('button', { name: 'Pausar' }))
    const frozen = screen.getByRole('timer').textContent
    await act(() => vi.advanceTimersByTimeAsync(5000))
    expect(screen.getByRole('timer')).toHaveTextContent(frozen ?? '')
  })

  it('sem rede ao salvar, o jogo continua e mostra o estado', async () => {
    const user = setup()
    openGame({ [SAVE]: () => Promise.reject(new TypeError('Failed to fetch')) })
    await screen.findByRole('grid')
    await user.keyboard('CA')
    await act(() => vi.advanceTimersByTimeAsync(1600))
    expect(await screen.findByText('Sem conexão, tentando de novo')).toBeInTheDocument()
    expect(grid()).toBeInTheDocument()
    await user.keyboard('L')
    expect(screen.getByRole('gridcell', { name: 'Linha 1, coluna 3, letra L' })).toBeInTheDocument()
  })

  it('com a sessão expirada o jogo continua e o login por cima reenvia a fila local', async () => {
    const user = setup()
    let saves = 0
    const { calls } = openGame({
      [SAVE]: () =>
        ++saves === 1
          ? apiError(401, 'unauthenticated')
          : jsonResponse(200, { progress: makeProgress() }),
      'POST /api/auth/login': () => jsonResponse(200, { user: aUser }),
    })
    await screen.findByRole('grid')
    await user.keyboard('CA')
    await act(() => vi.advanceTimersByTimeAsync(1600))
    expect(
      await screen.findByText(/Sua sessão expirou\. Entre de novo para salvar\./),
    ).toBeInTheDocument()
    expect(grid()).toBeInTheDocument()
    expect(await screen.findByText('Sessão expirada')).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'Entrar de novo' }))
    const dialog = screen.getByRole('dialog', { name: 'Entrar de novo' })
    expect(within(dialog).getByLabelText('E-mail')).toHaveValue(aUser.email)
    await user.type(within(dialog).getByLabelText('Senha'), 'segredo123')
    await user.click(within(dialog).getByRole('button', { name: 'Entrar' }))

    await waitFor(() => expect(calls.filter((call) => call.key === SAVE)).toHaveLength(2))
    expect(calls.filter((call) => call.key === SAVE)[1]?.body).toMatchObject({
      cells: cellsFrom(['CA.', '.#.', '...']),
    })
    await waitFor(() => expect(screen.queryByText(/Sua sessão expirou/)).not.toBeInTheDocument())
    expect(grid()).toBeInTheDocument()
  })

  it('letras da fila local mais novas que o servidor são reenviadas ao abrir', async () => {
    window.localStorage.setItem(
      `cruzadinha:outbox:${aUser.id}:${PUZZLE_ID}`,
      JSON.stringify({
        cells: cellsFrom(['CAL', '.#.', '...']),
        elapsedMs: 9000,
        status: 'in_progress',
        savedAt: '2026-10-14T13:00:00.000Z',
      }),
    )
    const { calls } = openGame()
    await screen.findByRole('grid')
    expect(screen.getByRole('gridcell', { name: 'Linha 1, coluna 3, letra L' })).toBeInTheDocument()
    await waitFor(() => expect(calls.filter((call) => call.key === SAVE)).toHaveLength(1))
  })
  describe('ajudas', () => {
    it('revela uma letra, marca a célula e guarda o uso no aparelho', async () => {
      const user = setup()
      openGame()
      await screen.findByRole('grid')
      await user.click(screen.getByRole('button', { name: /Revelar letra/ }))
      expect(screen.getByText('1/4 Letra')).toBeInTheDocument()
      expect(
        screen.getByRole('gridcell', { name: /Linha 1, coluna 1, letra C, com ajuda/ }),
      ).toBeInTheDocument()
      const stored = window.localStorage.getItem(`cruzadinha:help:${aUser.id}:${PUZZLE_ID}`)
      expect(stored).toContain('"letters":1')
    })

    it('ao reabrir no mesmo aparelho, contadores e marcas continuam', async () => {
      const user = setup()
      const first = openGame()
      await screen.findByRole('grid')
      await user.click(screen.getByRole('button', { name: /Revelar letra/ }))
      first.unmount()
      openGame({
        [PROGRESS]: () =>
          jsonResponse(200, {
            progress: makeProgress({ cells: cellsFrom(['C..', '.#.', '...']) }),
          }),
      })
      await screen.findByRole('grid')
      expect(screen.getByText('1/4 Letra')).toBeInTheDocument()
      expect(
        screen.getByRole('gridcell', { name: /Linha 1, coluna 1, letra C, com ajuda/ }),
      ).toBeInTheDocument()
    })

    it('verificar anuncia o resultado', async () => {
      const user = setup()
      openGame()
      await screen.findByRole('grid')
      await user.click(grid())
      await user.keyboard('x')
      await user.click(screen.getByRole('button', { name: 'Verificar' }))
      expect(
        screen
          .getAllByRole('status')
          .map((el) => el.textContent)
          .join(' '),
      ).toContain('Verificado: 1 letra errada')
      expect(
        screen.getByRole('gridcell', { name: /letra X, errada na verificação/ }),
      ).toBeInTheDocument()
    })
  })
})
