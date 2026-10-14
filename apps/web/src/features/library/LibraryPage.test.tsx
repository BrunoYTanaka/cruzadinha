import { screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { expectNoA11yViolations } from '../../test/axe'
import { makeLibraryItem } from '../../test/fixtures'
import { apiError, jsonResponse, mockApi } from '../../test/http'
import { renderRoutes, resetSessionHandlers } from '../../test/render'
import { LibraryPage } from './LibraryPage'
import { SOURCE_DOWN_KEY } from './source-down'

const routes = [
  { path: '/', element: <LibraryPage /> },
  { path: '/jogo/:id', element: <p>Jogo</p> },
  { path: '/dia/:date', element: <p>Busca</p> },
]

const items = [
  makeLibraryItem('2026-10-14'),
  makeLibraryItem('2026-10-13', {
    status: 'completed',
    finishedMs: 412_000,
    bestMs: 398_000,
    bestAt: '2026-10-10T09:12:45.000Z',
    completedAt: '2026-10-13T14:03:22.000Z',
  }),
  makeLibraryItem('2026-10-12', { status: 'in_progress', elapsedMs: 5_000 }),
  makeLibraryItem('2026-10-11'),
]

function library(list = items) {
  return mockApi({ 'GET /api/library': () => jsonResponse(200, { items: list }) })
}

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

describe('LibraryPage', () => {
  it('mostra o mês atual com a situação de cada dia por texto', async () => {
    library()
    renderRoutes(routes, ['/'])
    expect(await screen.findByRole('heading', { name: 'outubro de 2026' })).toBeInTheDocument()
    expect(
      screen.getByRole('link', { name: '13 de outubro, concluído em 6 minutos e 52 segundos' }),
    ).toHaveAttribute('href', '/jogo/00000000-0000-4000-8000-000020261013')
    expect(screen.getByText('✓ 06:52')).toBeInTheDocument()
    expect(screen.getByText('◐ Em jogo')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: '11 de outubro, não iniciado' })).toBeInTheDocument()
    expect(screen.getByText('Hoje')).toBeInTheDocument()
    expect(
      screen.getByRole('link', { name: 'Hoje, 14 de outubro, não iniciado' }),
    ).toBeInTheDocument()
  })

  it('dia futuro fica sem ação e dia passado não guardado leva à busca', async () => {
    library()
    renderRoutes(routes, ['/'])
    await screen.findByRole('heading', { name: 'outubro de 2026' })
    const future = screen.getByRole('img', { name: '15 de outubro, indisponível' })
    expect(future.closest('a')).toBeNull()
    expect(screen.queryByRole('link', { name: /^15 de outubro/ })).not.toBeInTheDocument()
    expect(
      screen.getByRole('link', { name: '1 de outubro, não guardado, abre para buscar na fonte' }),
    ).toHaveAttribute('href', '/dia/2026-10-01')
  })

  it('"Jogar a de hoje" abre o jogo de hoje quando guardado e a busca quando não', async () => {
    library()
    const first = renderRoutes(routes, ['/'])
    expect(await screen.findByRole('link', { name: 'Jogar a de hoje' })).toHaveAttribute(
      'href',
      '/jogo/00000000-0000-4000-8000-000020261014',
    )
    first.unmount()
    library(items.slice(1))
    renderRoutes(routes, ['/'])
    expect(await screen.findByRole('link', { name: 'Jogar a de hoje' })).toHaveAttribute(
      'href',
      '/dia/2026-10-14',
    )
  })

  it('navega entre meses e desabilita os botões nos limites', async () => {
    library()
    const user = userEvent.setup()
    renderRoutes(routes, ['/'])
    await screen.findByRole('heading', { name: 'outubro de 2026' })
    const previous = screen.getByRole('button', { name: 'Mês anterior' })
    const next = screen.getByRole('button', { name: 'Próximo mês' })
    expect(next).toBeDisabled()
    await user.click(previous)
    expect(screen.getByRole('heading', { name: 'setembro de 2026' })).toBeInTheDocument()
    expect(next).toBeEnabled()
    for (let step = 0; step < 11; step++) await user.click(previous)
    expect(screen.getByRole('heading', { name: 'outubro de 2025' })).toBeInTheDocument()
    expect(previous).toBeDisabled()
  })

  it('mostra erro com "Tentar de novo" quando a biblioteca falha', async () => {
    const { calls } = mockApi({ 'GET /api/library': () => apiError(500, 'internal-error') })
    const user = userEvent.setup()
    renderRoutes(routes, ['/'])
    expect(await screen.findByRole('alert')).toHaveTextContent(
      'Não foi possível carregar a biblioteca',
    )
    await user.click(screen.getByRole('button', { name: 'Tentar de novo' }))
    await waitFor(() =>
      expect(calls.filter((call) => call.key === 'GET /api/library')).toHaveLength(2),
    )
  })

  it('mostra "Sem conexão" quando não há rede', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => {
        throw new TypeError('Failed to fetch')
      }),
    )
    renderRoutes(routes, ['/'])
    expect(await screen.findByRole('alert')).toHaveTextContent('Sem conexão')
  })

  it('o aviso da fonte só aparece por 10 minutos e não esconde o que está guardado', async () => {
    library()
    window.localStorage.setItem(SOURCE_DOWN_KEY, String(Date.now() - 60_000))
    const first = renderRoutes(routes, ['/'])
    await screen.findByRole('heading', { name: 'outubro de 2026' })
    expect(screen.getByText(/Novas cruzadas não podem ser buscadas agora/)).toBeInTheDocument()
    expect(
      screen.getByRole('link', { name: '13 de outubro, concluído em 6 minutos e 52 segundos' }),
    ).toBeInTheDocument()
    first.unmount()

    window.localStorage.setItem(SOURCE_DOWN_KEY, String(Date.now() - 11 * 60_000))
    renderRoutes(routes, ['/'])
    await screen.findByRole('heading', { name: 'outubro de 2026' })
    expect(
      screen.queryByText(/Novas cruzadas não podem ser buscadas agora/),
    ).not.toBeInTheDocument()
  })

  it('lembra os dias em que a fonte disse que não há cruzada', async () => {
    library()
    window.sessionStorage.setItem('cruzadinha:no-puzzle:2026-10-03', '1')
    renderRoutes(routes, ['/'])
    await screen.findByRole('heading', { name: 'outubro de 2026' })
    const day = screen.getByRole('img', { name: '3 de outubro, sem cruzada neste dia' })
    expect(within(day).getByText('Sem cruzada')).toBeInTheDocument()
  })

  it('traz a legenda e passa nas regras de acessibilidade', async () => {
    library()
    const { container } = renderRoutes(routes, ['/'])
    await screen.findByRole('heading', { name: 'outubro de 2026' })
    const legend = screen.getByRole('list', { name: 'Legenda do calendário' })
    expect(within(legend).getAllByRole('listitem')).toHaveLength(5)
    await expectNoA11yViolations(container)
  })
})
