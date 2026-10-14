import { screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { makePuzzleResponse, PUZZLE_ID, TINY } from '../../test/fixtures'
import { apiError, jsonResponse, mockApi } from '../../test/http'
import { renderRoutes, resetSessionHandlers } from '../../test/render'
import { DayRoute } from './DayRoute'
import { SOURCE_DOWN_KEY } from './source-down'

function Game() {
  return <p>Jogo aberto</p>
}

const routes = [
  { path: '/dia/:date', element: <DayRoute /> },
  { path: '/jogo/:puzzleId', element: <Game /> },
  { path: '/', element: <p>Biblioteca</p> },
  { path: '*', element: <p>Não encontrada</p> },
]

beforeEach(() => {
  vi.useFakeTimers({ toFake: ['Date'] })
  vi.setSystemTime(new Date('2026-10-14T15:00:00Z'))
})

afterEach(() => {
  vi.useRealTimers()
  window.localStorage.clear()
  window.sessionStorage.clear()
  resetSessionHandlers()
})

describe('DayRoute', () => {
  it('em sucesso redireciona a /jogo/:id com replace e apaga o aviso da fonte', async () => {
    window.localStorage.setItem(SOURCE_DOWN_KEY, String(Date.now()))
    const { calls } = mockApi({
      'GET /api/puzzles': () => jsonResponse(200, makePuzzleResponse(TINY, { date: '2026-10-03' })),
    })
    const { router } = renderRoutes(routes, ['/dia/2026-10-03'])
    expect(screen.getByRole('status')).toHaveTextContent('Buscando a cruzada…')
    await waitFor(() => expect(router.state.location.pathname).toBe(`/jogo/${PUZZLE_ID}`))
    expect(await screen.findByText('Jogo aberto')).toBeInTheDocument()
    expect(calls[0]?.url).toBe('/api/puzzles?level=daily&date=2026-10-03')
    expect(window.localStorage.getItem(SOURCE_DOWN_KEY)).toBeNull()
    // replace: voltar não devolve à tela de busca
    expect(router.state.historyAction).toBe('REPLACE')
  })

  it('404 mostra "Não há cruzada neste dia." e lembra o dia', async () => {
    mockApi({ 'GET /api/puzzles': () => apiError(404, 'puzzle-unavailable') })
    renderRoutes(routes, ['/dia/2026-10-03'])
    expect(await screen.findByRole('alert')).toHaveTextContent('Não há cruzada neste dia.')
    expect(screen.getByRole('link', { name: 'Voltar à biblioteca' })).toHaveAttribute('href', '/')
    expect(window.sessionStorage.getItem('cruzadinha:no-puzzle:2026-10-03')).toBe('1')
  })

  it('502 mostra "A fonte está fora do ar agora." e grava o aviso da biblioteca', async () => {
    mockApi({ 'GET /api/puzzles': () => apiError(502, 'puzzle-source-failed') })
    renderRoutes(routes, ['/dia/2026-10-03'])
    expect(await screen.findByRole('alert')).toHaveTextContent('A fonte está fora do ar agora.')
    expect(screen.getByRole('alert')).toHaveTextContent('Tente mais tarde.')
    expect(window.localStorage.getItem(SOURCE_DOWN_KEY)).not.toBeNull()
  })

  it('429 mostra o tempo de espera', async () => {
    mockApi({
      'GET /api/puzzles': () =>
        jsonResponse(429, { error: 'too-many-attempts', message: 'x' }, { 'retry-after': '90' }),
    })
    renderRoutes(routes, ['/dia/2026-10-03'])
    expect(await screen.findByRole('alert')).toHaveTextContent('Muitas buscas seguidas.')
    expect(screen.getByRole('alert')).toHaveTextContent('Tente de novo em 2 min.')
  })

  it('"Tentar de novo" busca outra vez', async () => {
    let attempts = 0
    mockApi({
      'GET /api/puzzles': () =>
        ++attempts === 1
          ? apiError(502, 'puzzle-source-failed')
          : jsonResponse(200, makePuzzleResponse(TINY)),
    })
    const user = userEvent.setup()
    const { router } = renderRoutes(routes, ['/dia/2026-10-03'])
    await user.click(await screen.findByRole('button', { name: 'Tentar de novo' }))
    await waitFor(() => expect(router.state.location.pathname).toBe(`/jogo/${PUZZLE_ID}`))
  })

  it('dia futuro não chama a API', async () => {
    const { calls } = mockApi({})
    renderRoutes(routes, ['/dia/2026-10-20'])
    expect(await screen.findByRole('alert')).toHaveTextContent('Esse dia ainda não chegou')
    expect(calls).toHaveLength(0)
  })

  it('data inválida mostra a página não encontrada', async () => {
    const { calls } = mockApi({})
    renderRoutes(routes, ['/dia/2026-02-30'])
    expect(
      await screen.findByRole('heading', { name: 'Página não encontrada' }),
    ).toBeInTheDocument()
    expect(calls).toHaveLength(0)
  })
})
