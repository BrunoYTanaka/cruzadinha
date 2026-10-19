import { puzzleSourceIdSchema } from '@cruzadinha/shared'
import { act, fireEvent, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { expectNoA11yViolations } from '../../test/axe'
import { makeLibraryItem } from '../../test/fixtures'
import { apiError, jsonResponse, mockApi } from '../../test/http'
import { desktop, mockMatchMedia, phone } from '../../test/media'
import { queryKeys } from '../../api/query-keys'
import { aUser, makeQueryClient, renderRoutes, resetSessionHandlers } from '../../test/render'
import { AppLayout } from '../../app/AppLayout'
import { guestStore } from '../guest/guest-store'
import { LibraryPage } from './LibraryPage'
import { SOURCE_KEY } from './source-choice'
import { sourceDownKey } from './source-down'

const SOURCE_DOWN_KEY = sourceDownKey('oglobo')

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

// Biblioteca de uma conta (a de visitante tem testes próprios, feature 013).
function withAccount() {
  const queryClient = makeQueryClient()
  queryClient.setQueryData(queryKeys.session, { user: aUser })
  return queryClient
}

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
    renderRoutes(routes, ['/'], withAccount())
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
    renderRoutes(routes, ['/'], withAccount())
    await screen.findByRole('heading', { name: 'outubro de 2026' })
    const future = screen.getByRole('img', { name: '15 de outubro, indisponível' })
    expect(future.closest('a')).toBeNull()
    expect(screen.queryByRole('link', { name: /^15 de outubro/ })).not.toBeInTheDocument()
    expect(
      screen.getByRole('link', { name: '1 de outubro, não guardado, abre para buscar na fonte' }),
    ).toHaveAttribute('href', '/dia/2026-10-01?fonte=oglobo')
  })

  it('"Jogar a de hoje" abre o jogo de hoje quando guardado e a busca quando não', async () => {
    library()
    const first = renderRoutes(routes, ['/'], withAccount())
    expect(await screen.findByRole('link', { name: 'Jogar a de hoje' })).toHaveAttribute(
      'href',
      '/jogo/00000000-0000-4000-8000-000020261014',
    )
    first.unmount()
    library(items.slice(1))
    renderRoutes(routes, ['/'], withAccount())
    expect(await screen.findByRole('link', { name: 'Jogar a de hoje' })).toHaveAttribute(
      'href',
      '/dia/2026-10-14?fonte=oglobo',
    )
  })

  it('navega entre meses e desabilita os botões nos limites', async () => {
    library()
    const user = userEvent.setup()
    renderRoutes(routes, ['/'], withAccount())
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
    renderRoutes(routes, ['/'], withAccount())
    expect(await screen.findByRole('alert')).toHaveTextContent(
      'Não foi possível carregar a biblioteca',
    )
    await user.click(screen.getByRole('button', { name: 'Tentar de novo' }))
    // Uma consulta por fonte (feature 015): a nova tentativa pede de novo a fonte do calendário.
    await waitFor(() =>
      expect(calls.filter((call) => call.url === '/api/library?source=oglobo')).toHaveLength(2),
    )
  })

  it('mostra "Sem conexão" quando não há rede', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => {
        throw new TypeError('Failed to fetch')
      }),
    )
    renderRoutes(routes, ['/'], withAccount())
    expect(await screen.findByRole('alert')).toHaveTextContent('Sem conexão')
  })

  it('o aviso da fonte só aparece por 10 minutos e não esconde o que está guardado', async () => {
    library()
    window.localStorage.setItem(SOURCE_DOWN_KEY, String(Date.now() - 60_000))
    const first = renderRoutes(routes, ['/'], withAccount())
    await screen.findByRole('heading', { name: 'outubro de 2026' })
    expect(screen.getByText(/Novas cruzadas não podem ser buscadas agora/)).toBeInTheDocument()
    expect(
      screen.getByRole('link', { name: '13 de outubro, concluído em 6 minutos e 52 segundos' }),
    ).toBeInTheDocument()
    first.unmount()

    window.localStorage.setItem(SOURCE_DOWN_KEY, String(Date.now() - 11 * 60_000))
    renderRoutes(routes, ['/'], withAccount())
    await screen.findByRole('heading', { name: 'outubro de 2026' })
    expect(
      screen.queryByText(/Novas cruzadas não podem ser buscadas agora/),
    ).not.toBeInTheDocument()
  })

  it('lembra os dias em que a fonte disse que não há cruzada', async () => {
    library()
    window.sessionStorage.setItem('cruzadinha:no-puzzle:oglobo:2026-10-03', '1')
    renderRoutes(routes, ['/'], withAccount())
    await screen.findByRole('heading', { name: 'outubro de 2026' })
    const day = screen.getByRole('img', { name: '3 de outubro, sem cruzada neste dia' })
    expect(within(day).getByText('Sem cruzada')).toBeInTheDocument()
  })

  it('traz a legenda e passa nas regras de acessibilidade', async () => {
    library()
    const { container } = renderRoutes(routes, ['/'], withAccount())
    await screen.findByRole('heading', { name: 'outubro de 2026' })
    const legend = screen.getByRole('list', { name: 'Legenda do calendário' })
    expect(within(legend).getAllByRole('listitem')).toHaveLength(5)
    await expectNoA11yViolations(container)
  })

  describe('largura do calendário (feature 011)', () => {
    const KEY = 'cruzadinha:library-width'
    const handle = () => screen.getByRole('slider', { name: 'Largura do calendário' })
    // A coluna da biblioteca: título > bloco do título > faixa do topo > página.
    const page = () =>
      screen.getByRole('heading', { name: 'Escolha um dia' }).parentElement!.parentElement!
        .parentElement!

    afterEach(() => {
      vi.unstubAllGlobals()
    })

    it('no computador há uma alça; sem escolha, a largura é automática', async () => {
      mockMatchMedia(desktop)
      library()
      renderRoutes(routes, ['/'], withAccount())
      expect(await screen.findByRole('heading', { name: 'outubro de 2026' })).toBeInTheDocument()
      expect(handle().getAttribute('aria-valuetext')).toMatch(/, automático$/)
      expect(page().style.getPropertyValue('--library-width')).toBe('')
    })

    it('as setas guardam a largura; clique duplo volta ao automático', async () => {
      const user = userEvent.setup()
      mockMatchMedia(desktop)
      library()
      renderRoutes(routes, ['/'], withAccount())
      await screen.findByRole('heading', { name: 'outubro de 2026' })
      handle().focus()
      await user.keyboard('{ArrowLeft}')
      expect(window.localStorage.getItem(KEY)).toBe('{"width":1560}')
      expect(page().style.getPropertyValue('--library-width')).toBe(
        'calc(1560px + 2 * var(--gutter))',
      )
      fireEvent.doubleClick(handle())
      expect(window.localStorage.getItem(KEY)).toBeNull()
      expect(page().style.getPropertyValue('--library-width')).toBe('')
    })

    it('uma largura guardada vale ao abrir', async () => {
      window.localStorage.setItem(KEY, '{"width":1000}')
      mockMatchMedia(desktop)
      library()
      renderRoutes(routes, ['/'], withAccount())
      await screen.findByRole('heading', { name: 'outubro de 2026' })
      expect(handle()).toHaveAttribute('aria-valuenow', '1000')
      expect(page().style.getPropertyValue('--library-width')).toBe(
        'calc(1000px + 2 * var(--gutter))',
      )
    })

    it('no celular não há alça e a largura guardada é ignorada, sem ser apagada', async () => {
      window.localStorage.setItem(KEY, '{"width":1000}')
      const media = mockMatchMedia(phone)
      library()
      renderRoutes(routes, ['/'], withAccount())
      await screen.findByRole('heading', { name: 'outubro de 2026' })
      expect(screen.queryByRole('slider')).toBeNull()
      expect(page().style.getPropertyValue('--library-width')).toBe('')
      act(() => media.change(desktop))
      expect(page().style.getPropertyValue('--library-width')).toBe(
        'calc(1000px + 2 * var(--gutter))',
      )
      expect(window.localStorage.getItem(KEY)).toBe('{"width":1000}')
    })

    it('a pegada de canto não aparece para o leitor de tela nem no Tab', async () => {
      mockMatchMedia(desktop)
      library()
      const { container } = renderRoutes(routes, ['/'], withAccount())
      await screen.findByRole('heading', { name: 'outubro de 2026' })
      expect(screen.getAllByRole('slider')).toHaveLength(1)
      const hidden = container.querySelectorAll('[aria-hidden="true"][tabindex="-1"]')
      expect(hidden.length).toBeGreaterThan(0)
      await expectNoA11yViolations(container)
    })
  })
})

describe('escolha da fonte (feature 014)', () => {
  const cruzadaItems = [
    makeLibraryItem('2026-10-12', {
      puzzleId: '00000000-0000-4000-8000-00000000c012',
      source: 'cruzadaonline',
      status: 'in_progress',
      elapsedMs: 9_000,
    }),
  ]

  // Responde a biblioteca de cada fonte pelo parâmetro `source`.
  function bySource() {
    return mockApi({
      'GET /api/library': ({ url }) =>
        jsonResponse(200, {
          items:
            new URL(url, 'http://x').searchParams.get('source') === 'cruzadaonline'
              ? cruzadaItems
              : items,
        }),
    })
  }

  it('começa em O Globo e troca para Cruzada Online sem mudar o mês', async () => {
    const { calls } = bySource()
    const user = userEvent.setup()
    renderRoutes(routes, ['/'], withAccount())
    await screen.findByRole('heading', { name: 'outubro de 2026' })
    expect(calls[0]?.url).toBe('/api/library?source=oglobo')
    expect(screen.getByRole('button', { name: 'O Globo' })).toHaveAttribute('aria-pressed', 'true')

    await user.click(screen.getByRole('button', { name: 'Mês anterior' }))
    await user.click(screen.getByRole('button', { name: 'Cruzada Online' }))
    expect(await screen.findByRole('heading', { name: 'setembro de 2026' })).toBeInTheDocument()
    expect(calls.at(-1)?.url).toBe('/api/library?source=cruzadaonline')
    expect(window.localStorage.getItem(SOURCE_KEY)).toBe('cruzadaonline')

    await user.click(screen.getByRole('button', { name: 'Próximo mês' }))
    expect(screen.getByText('◐ Em jogo')).toBeInTheDocument()
    expect(
      screen.queryByRole('link', { name: '13 de outubro, concluído em 6 minutos e 52 segundos' }),
    ).not.toBeInTheDocument()
  })

  it('a preferência gravada abre direto na fonte escolhida', async () => {
    window.localStorage.setItem(SOURCE_KEY, 'cruzadaonline')
    const { calls } = bySource()
    renderRoutes(routes, ['/'], withAccount())
    await screen.findByRole('heading', { name: 'outubro de 2026' })
    expect(calls.map((call) => call.url)).toContain('/api/library?source=cruzadaonline')
    expect(screen.getByRole('button', { name: 'Cruzada Online' })).toHaveAttribute(
      'aria-pressed',
      'true',
    )
    expect(screen.getByRole('link', { name: 'Jogar a de hoje' })).toHaveAttribute(
      'href',
      '/dia/2026-10-14?fonte=cruzadaonline',
    )
    expect(
      screen.getByRole('link', { name: '1 de outubro, não guardado, abre para buscar na fonte' }),
    ).toHaveAttribute('href', '/dia/2026-10-01?fonte=cruzadaonline')
  })

  it('o aviso de fonte fora do ar vale só para a fonte marcada', async () => {
    window.localStorage.setItem(sourceDownKey('cruzadaonline'), String(Date.now()))
    bySource()
    const user = userEvent.setup()
    renderRoutes(routes, ['/'], withAccount())
    await screen.findByRole('heading', { name: 'outubro de 2026' })
    expect(
      screen.queryByText(/Novas cruzadas não podem ser buscadas agora/),
    ).not.toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Cruzada Online' }))
    expect(
      await screen.findByText(/Novas cruzadas não podem ser buscadas agora/),
    ).toBeInTheDocument()
  })

  it('itens de outra fonte (API anterior) não entram no calendário', async () => {
    window.localStorage.setItem(SOURCE_KEY, 'cruzadaonline')
    library()
    renderRoutes(routes, ['/'], withAccount())
    await screen.findByRole('heading', { name: 'outubro de 2026' })
    expect(screen.queryByText('◐ Em jogo')).not.toBeInTheDocument()
    expect(
      screen.getByRole('link', { name: '13 de outubro, não guardado, abre para buscar na fonte' }),
    ).toBeInTheDocument()
  })

  it('o seletor continua visível enquanto a biblioteca carrega', async () => {
    mockApi({ 'GET /api/library': () => new Promise<Response>(() => {}) })
    renderRoutes(routes, ['/'], withAccount())
    expect(await screen.findByRole('group', { name: 'Fonte da cruzada' })).toBeInTheDocument()
    expect(screen.getByRole('status')).toHaveTextContent('Carregando a biblioteca…')
  })
})

describe('biblioteca do visitante (feature 013)', () => {
  const guestRoutes = [
    {
      element: <AppLayout />,
      children: [
        { path: '/', element: <LibraryPage /> },
        { path: '/login', element: <p>Tela de login</p> },
        { path: '/jogo/:id', element: <p>Jogo</p> },
        { path: '/dia/:date', element: <p>Busca</p> },
      ],
    },
  ]
  const publicItems = items.map((item) => makeLibraryItem(item.date, { puzzleId: item.puzzleId }))

  function asGuest() {
    const queryClient = makeQueryClient()
    queryClient.setQueryData(queryKeys.session, null)
    return queryClient
  }

  it('abre direto o calendário do mês atual, sem nada por cima, com "Visitante" e "Entrar"', async () => {
    mockApi({
      'GET /api/library': () => jsonResponse(200, { items: publicItems }),
      'GET /api/health': () => jsonResponse(200, { status: 'ok', database: 'up' }),
    })
    const { container } = renderRoutes(guestRoutes, ['/'], asGuest())
    expect(await screen.findByRole('heading', { name: 'outubro de 2026' })).toBeInTheDocument()
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    expect(screen.queryByRole('status')).not.toBeInTheDocument()
    expect(screen.getByText('Visitante')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Entrar' })).toHaveAttribute('href', '/login')
    await expectNoA11yViolations(container)
  })

  it('"Entrar" é alcançado pelo teclado, com foco visível, e segue com Enter', async () => {
    mockApi({ 'GET /api/library': () => jsonResponse(200, { items: publicItems }) })
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime })
    const { router } = renderRoutes(guestRoutes, ['/'], asGuest())
    const enter = await screen.findByRole('link', { name: 'Entrar' })
    for (let step = 0; step < 10 && document.activeElement !== enter; step++) await user.tab()
    expect(enter).toHaveFocus()
    await user.keyboard('{Enter}')
    await waitFor(() => expect(router.state.location.pathname).toBe('/login'))
  })

  it('mostra a situação e o tempo de cada dia a partir do navegador', async () => {
    await guestStore.save({
      puzzleId: publicItems[1]?.puzzleId ?? '',
      date: '2026-10-13',
      cells: [['A']],
      elapsedMs: 412_000,
      status: 'completed',
      savedAt: '2026-10-13T14:00:00.000Z',
      help: null,
    })
    await guestStore.save({
      puzzleId: publicItems[2]?.puzzleId ?? '',
      date: '2026-10-12',
      cells: [['A']],
      elapsedMs: 5_000,
      status: 'in_progress',
      savedAt: '2026-10-12T14:00:00.000Z',
      help: null,
    })
    mockApi({ 'GET /api/library': () => jsonResponse(200, { items: publicItems }) })
    renderRoutes(guestRoutes, ['/'], asGuest())
    expect(
      await screen.findByRole('link', {
        name: '13 de outubro, concluído em 6 minutos e 52 segundos',
      }),
    ).toBeInTheDocument()
    expect(screen.getByText('◐ Em jogo')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: '11 de outubro, não iniciado' })).toBeInTheDocument()
  })

  it('na Cruzada Online, a situação do visitante vem do navegador pelo puzzle', async () => {
    window.localStorage.setItem(SOURCE_KEY, 'cruzadaonline')
    const cruzadaId = '00000000-0000-4000-8000-00000000c012'
    await guestStore.save({
      puzzleId: cruzadaId,
      date: '2026-10-12',
      cells: [['A']],
      elapsedMs: 5_000,
      status: 'in_progress',
      savedAt: '2026-10-12T14:00:00.000Z',
      help: null,
    })
    mockApi({
      'GET /api/library': () =>
        jsonResponse(200, {
          items: [makeLibraryItem('2026-10-12', { puzzleId: cruzadaId, source: 'cruzadaonline' })],
        }),
    })
    renderRoutes(guestRoutes, ['/'], asGuest())
    expect(await screen.findByText('◐ Em jogo')).toBeInTheDocument()
  })

  it('com a API anterior (401 sem sessão), pede para entrar em vez de travar', async () => {
    const { calls } = mockApi({
      'GET /api/library': () => apiError(401, 'unauthenticated'),
    })
    renderRoutes(guestRoutes, ['/'], asGuest())
    expect(await screen.findByText('Entre para ver a biblioteca')).toBeInTheDocument()
    // Um pedido por fonte e nenhuma nova tentativa.
    expect(calls.filter((call) => call.url === '/api/library?source=oglobo')).toHaveLength(1)
    expect(calls.filter((call) => call.key === 'GET /api/library')).toHaveLength(
      puzzleSourceIdSchema.options.length,
    )
  })
})
