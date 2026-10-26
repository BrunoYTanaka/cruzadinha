import { screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { makePuzzleResponse, PUZZLE_ID, TINY } from '../../test/fixtures'
import { apiError, jsonResponse, mockApi } from '../../test/http'
import { renderRoutes, resetSessionHandlers } from '../../test/render'
import { DayRoute } from './DayRoute'
import { getSettings, updateSettings } from '../../shared/services/settings-store/settings-store'
import { sourceDownKey } from '../../features/library/helpers/source-down'

const SOURCE_DOWN_KEY = sourceDownKey('oglobo')

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

describe('DayRoute com fonte (feature 014)', () => {
  const cruzada = () =>
    jsonResponse(200, makePuzzleResponse(TINY, { date: '2026-10-10', source: 'cruzadaonline' }))

  it('?fonte= pede a fonte e abre o jogo, sem mudar a cruzada padrão (feature 021)', async () => {
    const { calls } = mockApi({ 'GET /api/puzzles': cruzada })
    const { router } = renderRoutes(routes, ['/dia/2026-10-10?fonte=cruzadaonline'])
    await waitFor(() => expect(router.state.location.pathname).toBe(`/jogo/${PUZZLE_ID}`))
    expect(calls[0]?.url).toBe('/api/puzzles?level=daily&date=2026-10-10&source=cruzadaonline')
    expect(getSettings().defaultSource).toBe('oglobo')
  })

  it('?fonte=cruzadasbrasil pede a terceira fonte (feature 029)', async () => {
    const { calls } = mockApi({
      'GET /api/puzzles': () =>
        jsonResponse(
          200,
          makePuzzleResponse(TINY, { date: '2026-10-10', source: 'cruzadasbrasil' }),
        ),
    })
    const { router } = renderRoutes(routes, ['/dia/2026-10-10?fonte=cruzadasbrasil'])
    await waitFor(() => expect(router.state.location.pathname).toBe(`/jogo/${PUZZLE_ID}`))
    expect(calls[0]?.url).toBe('/api/puzzles?level=daily&date=2026-10-10&source=cruzadasbrasil')
  })

  it.each(['', '?fonte=xyz'])('sem fonte válida (%s) usa a cruzada padrão', async (query) => {
    updateSettings({ defaultSource: 'cruzadaonline' })
    const { calls } = mockApi({ 'GET /api/puzzles': cruzada })
    renderRoutes(routes, [`/dia/2026-10-10${query}`])
    await screen.findByText('Jogo aberto')
    expect(calls[0]?.url).toContain('&source=cruzadaonline')
    expect(getSettings().defaultSource).toBe('cruzadaonline')
  })

  it('resposta de outra fonte (API anterior) não abre o jogo', async () => {
    mockApi({
      'GET /api/puzzles': () => jsonResponse(200, makePuzzleResponse(TINY, { date: '2026-10-10' })),
    })
    const { router, queryClient } = renderRoutes(routes, ['/dia/2026-10-10?fonte=cruzadaonline'])
    expect(await screen.findByRole('alert')).toHaveTextContent(
      'Esta fonte não está disponível agora',
    )
    expect(screen.getByRole('link', { name: 'Voltar à biblioteca' })).toBeInTheDocument()
    expect(router.state.location.pathname).toBe('/dia/2026-10-10')
    expect(queryClient.getQueryData(['puzzle', PUZZLE_ID])).toBeUndefined()
  })

  it('404 e 502 marcam só a fonte pedida', async () => {
    mockApi({ 'GET /api/puzzles': () => apiError(404, 'puzzle-unavailable') })
    const first = renderRoutes(routes, ['/dia/2026-10-03?fonte=cruzadaonline'])
    await screen.findByRole('alert')
    expect(window.sessionStorage.getItem('cruzadinha:no-puzzle:cruzadaonline:2026-10-03')).toBe('1')
    expect(window.sessionStorage.getItem('cruzadinha:no-puzzle:oglobo:2026-10-03')).toBeNull()
    first.unmount()

    mockApi({ 'GET /api/puzzles': () => apiError(502, 'puzzle-source-failed') })
    renderRoutes(routes, ['/dia/2026-10-04?fonte=cruzadaonline'])
    await screen.findByRole('alert')
    expect(window.localStorage.getItem(sourceDownKey('cruzadaonline'))).not.toBeNull()
    expect(window.localStorage.getItem(SOURCE_DOWN_KEY)).toBeNull()
  })
})

describe('DayRoute com a fonte clube (feature 030)', () => {
  it('um dia salvo abre o jogo pela API, sem ser tratado como busca', async () => {
    const { calls } = mockApi({
      'GET /api/puzzles': () =>
        jsonResponse(200, makePuzzleResponse(TINY, { date: '2026-10-05', source: 'clube' })),
    })
    const { router } = renderRoutes(routes, ['/dia/2026-10-05?fonte=clube'])
    await waitFor(() => expect(router.state.location.pathname).toBe(`/jogo/${PUZZLE_ID}`))
    expect(calls[0]?.url).toBe('/api/puzzles?level=daily&date=2026-10-05&source=clube')
  })

  it('um dia sem edição mostra "Não há cruzada neste dia." e lembra só para a clube', async () => {
    mockApi({ 'GET /api/puzzles': () => apiError(404, 'puzzle-unavailable') })
    renderRoutes(routes, ['/dia/2026-10-03?fonte=clube'])
    expect(await screen.findByRole('alert')).toHaveTextContent('Não há cruzada neste dia.')
    expect(window.sessionStorage.getItem('cruzadinha:no-puzzle:clube:2026-10-03')).toBe('1')
    expect(window.sessionStorage.getItem('cruzadinha:no-puzzle:oglobo:2026-10-03')).toBeNull()
  })

  it('uma API anterior que recusa a fonte (400) deixa a fonte indisponível, sem tentar de novo', async () => {
    const { calls } = mockApi({ 'GET /api/puzzles': () => apiError(400, 'invalid-input') })
    renderRoutes(routes, ['/dia/2026-10-03?fonte=clube'])
    expect(await screen.findByRole('alert')).toHaveTextContent(
      'Esta fonte não está disponível agora',
    )
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent(
      'Esta fonte não está disponível agora',
    )
    expect(screen.queryByRole('button', { name: 'Tentar de novo' })).not.toBeInTheDocument()
    expect(calls).toHaveLength(1)
  })
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
    expect(calls[0]?.url).toBe('/api/puzzles?level=daily&date=2026-10-03&source=oglobo')
    expect(window.localStorage.getItem(SOURCE_DOWN_KEY)).toBeNull()
    // replace: voltar não devolve à tela de busca
    expect(router.state.historyAction).toBe('REPLACE')
  })

  it('404 mostra "Não há cruzada neste dia." e lembra o dia', async () => {
    mockApi({ 'GET /api/puzzles': () => apiError(404, 'puzzle-unavailable') })
    renderRoutes(routes, ['/dia/2026-10-03'])
    expect(await screen.findByRole('alert')).toHaveTextContent('Não há cruzada neste dia.')
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('Não há cruzada neste dia.')
    expect(screen.getByRole('link', { name: 'Voltar à biblioteca' })).toHaveAttribute('href', '/')
    expect(window.sessionStorage.getItem('cruzadinha:no-puzzle:oglobo:2026-10-03')).toBe('1')
  })

  it('502 mostra "A fonte está fora do ar agora." e grava o aviso da biblioteca', async () => {
    mockApi({ 'GET /api/puzzles': () => apiError(502, 'puzzle-source-failed') })
    renderRoutes(routes, ['/dia/2026-10-03'])
    expect(await screen.findByRole('alert')).toHaveTextContent('A fonte está fora do ar agora.')
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent(
      'A fonte está fora do ar agora.',
    )
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
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('Muitas buscas seguidas.')
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
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('Esse dia ainda não chegou')
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
