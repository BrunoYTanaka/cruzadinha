import { puzzleSourceIdSchema } from '@cruzadinha/shared'
import { act, fireEvent, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { expectNoA11yViolations } from '../../test/axe'
import { makeLibraryItem, makePuzzleResponse, TINY } from '../../test/fixtures'
import { apiError, jsonResponse, mockApi } from '../../test/http'
import { desktop, mockMatchMedia, phone } from '../../test/media'
import { queryKeys } from '../../shared/services/api/query-keys/query-keys'
import { aUser, makeQueryClient, renderRoutes, resetSessionHandlers } from '../../test/render'
import { AppLayout } from '../../app/AppLayout'
import { guestStore } from '../../features/guest/services/guest-store'
import { savePuzzle } from '../../features/offline'
import { LibraryPage } from './LibraryPage'
import { rememberGameSource } from '../../features/library/services/source-choice'
import { loadLibraryWidth } from '../../features/library/services/library-width'
import { getSettings, updateSettings } from '../../shared/services/settings-store/settings-store'
import { sourceDownKey } from '../../features/library/helpers/source-down'

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
  vi.restoreAllMocks()
  vi.useRealTimers()
  window.localStorage.clear()
  window.sessionStorage.clear()
  resetSessionHandlers()
})

describe('LibraryPage', () => {
  it('abre na aba da fonte do jogo de onde a pessoa voltou e só nesta montagem (feature 031)', async () => {
    library()
    rememberGameSource('cruzadaonline')
    const first = renderRoutes(routes, ['/'], withAccount())
    expect(await screen.findByRole('tab', { name: /Cruzada Online/ })).toHaveAttribute(
      'aria-selected',
      'true',
    )
    first.unmount()
    renderRoutes(routes, ['/'], withAccount())
    expect(await screen.findByRole('tab', { name: /O Globo/ })).toHaveAttribute(
      'aria-selected',
      'true',
    )
  })

  it('fonte lembrada que o site não conhece abre na cruzada padrão (feature 031)', async () => {
    library()
    rememberGameSource('nova-fonte')
    renderRoutes(routes, ['/'], withAccount())
    expect(await screen.findByRole('tab', { name: /O Globo/ })).toHaveAttribute(
      'aria-selected',
      'true',
    )
  })

  it('sem rede lista só os dias guardados, sem pedir a biblioteca (feature 041)', async () => {
    await savePuzzle(makePuzzleResponse(TINY, { date: '2026-10-13' }))
    vi.spyOn(navigator, 'onLine', 'get').mockReturnValue(false)
    const { calls } = mockApi({})
    renderRoutes(routes, ['/'], withAccount())
    expect(await screen.findByText(/Sem conexão: mostrando só as cruzadas guardadas/)).toBeVisible()
    expect(calls.some((call) => call.key.startsWith('GET /api/library'))).toBe(false)
    expect(
      await screen.findByRole('link', { name: '13 de outubro, não iniciado, disponível sem rede' }),
    ).toBeInTheDocument()
  })

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
    expect(within(screen.getByRole('table')).getByText('Hoje')).toBeInTheDocument()
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

  it('mostra "Hoje" com um cartão por fonte, cada um um link para a cruzada do dia', async () => {
    library()
    const first = renderRoutes(routes, ['/'], withAccount())
    expect(await screen.findByRole('heading', { level: 1, name: 'Hoje' })).toBeInTheDocument()
    expect(screen.queryByRole('link', { name: 'Jogar a de hoje' })).not.toBeInTheDocument()
    expect(
      await screen.findByRole('link', { name: 'O Globo: não iniciada. Jogar' }),
    ).toHaveAttribute('href', '/jogo/00000000-0000-4000-8000-000020261014')
    // A resposta só traz O Globo (como a API anterior à feature 014): a Cruzada Online não herda o
    // puzzle de outra fonte.
    expect(
      screen.getByRole('link', { name: 'Cruzada Online: ainda não guardada. Jogar' }),
    ).toHaveAttribute('href', '/dia/2026-10-14?fonte=cruzadaonline')
    first.unmount()
    library(items.slice(1))
    renderRoutes(routes, ['/'], withAccount())
    expect(
      await screen.findByRole('link', { name: 'O Globo: ainda não guardada. Jogar' }),
    ).toHaveAttribute('href', '/dia/2026-10-14?fonte=oglobo')
  })

  it('a falha de uma fonte fica no cartão dela; a outra e o calendário seguem', async () => {
    const { calls } = mockApi({
      'GET /api/library': ({ url }) =>
        new URL(url, 'http://x').searchParams.get('source') === 'cruzadaonline'
          ? apiError(500, 'internal-error')
          : jsonResponse(200, { items }),
    })
    const user = userEvent.setup()
    renderRoutes(routes, ['/'], withAccount())
    expect(await screen.findByRole('heading', { name: 'outubro de 2026' })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'O Globo: não iniciada. Jogar' })).toBeInTheDocument()
    const failed = await screen.findByText('Não foi possível carregar.')
    const card = failed.closest('li')!
    await user.click(within(card).getByRole('button', { name: 'Tentar de novo' }))
    await waitFor(() =>
      expect(calls.filter((call) => call.url === '/api/library?source=cruzadaonline')).toHaveLength(
        2,
      ),
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
    const alert = await screen.findByRole('alert')
    expect(alert).toHaveTextContent('Não foi possível carregar a biblioteca')
    // A página já tem o h1 "Hoje": o erro do calendário entra como h2 (feature 027).
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('Hoje')
    expect(within(alert).getByRole('heading', { level: 2 })).toHaveTextContent(
      'Não foi possível carregar a biblioteca',
    )
    // O cartão da fonte também oferece nova tentativa; aqui vale a do calendário.
    await user.click(within(alert).getByRole('button', { name: 'Tentar de novo' }))
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
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('Hoje')
    expect(within(screen.getByRole('alert')).getByRole('heading', { level: 2 })).toHaveTextContent(
      'Sem conexão',
    )
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
    // A coluna da biblioteca: título > cabeçalho de "Hoje" > seção "Hoje" > página.
    const page = () =>
      screen.getByRole('heading', { level: 1, name: 'Hoje' }).parentElement!.parentElement!
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
      expect(loadLibraryWidth()).toBe(1560)
      expect(page().style.getPropertyValue('--library-width')).toBe(
        'calc(1560px + 2 * var(--gutter))',
      )
      fireEvent.doubleClick(handle())
      expect(loadLibraryWidth()).toBeNull()
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
      expect(loadLibraryWidth()).toBe(1000)
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

describe('abas de fonte (features 014 e 015)', () => {
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
    expect(screen.getByRole('tab', { name: /^O Globo/ })).toHaveAttribute('aria-selected', 'true')
    const requests = calls.length

    await user.click(screen.getByRole('button', { name: 'Mês anterior' }))
    await user.click(screen.getByRole('tab', { name: /^Cruzada Online/ }))
    expect(await screen.findByRole('heading', { name: 'setembro de 2026' })).toBeInTheDocument()
    // As duas fontes já vieram juntas: trocar de aba não pede de novo (feature 015).
    expect(calls).toHaveLength(requests)
    // A aba não é preferência: a cruzada padrão continua a mesma (feature 021).
    expect(getSettings().defaultSource).toBe('oglobo')

    await user.click(screen.getByRole('button', { name: 'Próximo mês' }))
    expect(screen.getByText('◐ Em jogo')).toBeInTheDocument()
    expect(
      screen.queryByRole('link', { name: '13 de outubro, concluído em 6 minutos e 52 segundos' }),
    ).not.toBeInTheDocument()
  })

  it('a cruzada padrão abre direto na fonte escolhida', async () => {
    updateSettings({ defaultSource: 'cruzadaonline' })
    const { calls } = bySource()
    renderRoutes(routes, ['/'], withAccount())
    await screen.findByRole('heading', { name: 'outubro de 2026' })
    expect(calls.map((call) => call.url)).toContain('/api/library?source=cruzadaonline')
    expect(screen.getByRole('tab', { name: /^Cruzada Online/ })).toHaveAttribute(
      'aria-selected',
      'true',
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
    await user.click(screen.getByRole('tab', { name: /^Cruzada Online/ }))
    expect(
      await screen.findByText(/Novas cruzadas não podem ser buscadas agora/),
    ).toBeInTheDocument()
  })

  it('itens de outra fonte (API anterior) não entram no calendário', async () => {
    updateSettings({ defaultSource: 'cruzadaonline' })
    library()
    renderRoutes(routes, ['/'], withAccount())
    await screen.findByRole('heading', { name: 'outubro de 2026' })
    expect(screen.queryByText('◐ Em jogo')).not.toBeInTheDocument()
    expect(
      screen.getByRole('link', { name: '13 de outubro, não guardado, abre para buscar na fonte' }),
    ).toBeInTheDocument()
  })

  it('as abas continuam visíveis enquanto a biblioteca carrega', async () => {
    mockApi({ 'GET /api/library': () => new Promise<Response>(() => {}) })
    renderRoutes(routes, ['/'], withAccount())
    expect(await screen.findByRole('tablist', { name: 'Fonte do calendário' })).toBeInTheDocument()
    expect(screen.getByRole('status')).toHaveTextContent('Carregando a biblioteca…')
  })

  it('o calendário é o painel da aba escolhida', async () => {
    bySource()
    const user = userEvent.setup()
    renderRoutes(routes, ['/'], withAccount())
    await screen.findByRole('heading', { name: 'outubro de 2026' })
    expect(screen.getByRole('tabpanel', { name: /^O Globo/ })).toBeInTheDocument()
    await user.click(screen.getByRole('tab', { name: /^Cruzada Online/ }))
    expect(screen.getByRole('tabpanel', { name: /^Cruzada Online/ })).toBeInTheDocument()
  })

  it('cada aba conta as concluídas do mês exibido', async () => {
    bySource()
    const user = userEvent.setup()
    renderRoutes(routes, ['/'], withAccount())
    await screen.findByRole('heading', { name: 'outubro de 2026' })
    expect(screen.getByRole('tab', { name: 'O Globo 1 concluída' })).toBeInTheDocument()
    expect(screen.getByRole('tab', { name: 'Cruzada Online 0 concluídas' })).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Mês anterior' }))
    expect(screen.getByRole('tab', { name: 'O Globo 0 concluídas' })).toBeInTheDocument()
  })
})

describe('a fonte clube (feature 030)', () => {
  const clubeItem = makeLibraryItem('2026-10-12', {
    puzzleId: '00000000-0000-4000-8000-00000000d012',
    source: 'clube',
    status: 'completed',
    finishedMs: 61_000,
  })

  function allSources(clube: (() => Response) | undefined = undefined) {
    return mockApi({
      'GET /api/library': ({ url }) => {
        const source = new URL(url, 'http://x').searchParams.get('source')
        if (source === 'clube') return clube ? clube() : jsonResponse(200, { items: [clubeItem] })
        return jsonResponse(200, { items: source === 'cruzadaonline' ? [] : items })
      },
    })
  }

  it('mostra quatro abas e quatro cartões "Hoje", cada um no seu lugar', async () => {
    allSources()
    renderRoutes(routes, ['/'], withAccount())
    await screen.findByRole('heading', { name: 'outubro de 2026' })
    const tabs = screen.getAllByRole('tab')
    expect(tabs.map((tab) => tab.textContent)).toEqual([
      expect.stringContaining('O Globo'),
      expect.stringContaining('Cruzada Online'),
      expect.stringContaining('Cruzadas Brasil'),
      expect.stringContaining('Cruzadas Clube'),
    ])
    const clubeCard = screen.getByText('Sem cruzada hoje').closest('li')!
    expect(clubeCard).toHaveTextContent('Cruzadas Clube')
    expect(within(clubeCard).queryByRole('link')).not.toBeInTheDocument()
  })

  it('um dia passado sem edição aparece sem cruzada, sem link para buscar', async () => {
    allSources()
    const user = userEvent.setup()
    renderRoutes(routes, ['/'], withAccount())
    await screen.findByRole('heading', { name: 'outubro de 2026' })
    await user.click(screen.getByRole('tab', { name: /^Cruzadas Clube/ }))

    // O dia salvo é um link para o jogo; o 10 (passado, sem edição) não é link nem busca.
    expect(
      screen.getByRole('link', { name: '12 de outubro, concluído em 1 minuto e 1 segundo' }),
    ).toHaveAttribute('href', `/jogo/${clubeItem.puzzleId}`)
    expect(screen.queryByRole('link', { name: /^10 de outubro/ })).not.toBeInTheDocument()
    expect(
      screen.getByRole('img', { name: '10 de outubro, sem cruzada neste dia' }),
    ).toBeInTheDocument()
    expect(screen.getByRole('table').querySelector('a[href^="/dia/"]')).toBeNull()
  })

  it('o contador de concluídas da aba conta só a fonte dela', async () => {
    allSources()
    renderRoutes(routes, ['/'], withAccount())
    await screen.findByRole('heading', { name: 'outubro de 2026' })
    expect(screen.getByRole('tab', { name: /^Cruzadas Clube/ })).toHaveTextContent('1')
  })

  it('uma API anterior que recusa a fonte (400) deixa só a aba dela indisponível', async () => {
    allSources(() => apiError(400, 'invalid-input'))
    const user = userEvent.setup()
    renderRoutes(routes, ['/'], withAccount())
    await screen.findByRole('heading', { name: 'outubro de 2026' })
    await user.click(screen.getByRole('tab', { name: /^Cruzadas Clube/ }))

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'Esta fonte não está disponível agora',
    )
    expect(screen.queryByRole('button', { name: 'Tentar de novo' })).not.toBeInTheDocument()
    await user.click(screen.getByRole('tab', { name: /^O Globo/ }))
    expect(
      screen.getByRole('link', { name: 'Hoje, 14 de outubro, não iniciado' }),
    ).toBeInTheDocument()
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

  it('o cartão de hoje do visitante mostra a situação guardada no navegador', async () => {
    await guestStore.save({
      puzzleId: publicItems[0]?.puzzleId ?? '',
      date: '2026-10-14',
      cells: [['A']],
      elapsedMs: 65_000,
      status: 'in_progress',
      savedAt: '2026-10-14T14:00:00.000Z',
      help: null,
    })
    mockApi({ 'GET /api/library': () => jsonResponse(200, { items: publicItems }) })
    renderRoutes(guestRoutes, ['/'], asGuest())
    expect(
      await screen.findByRole('link', {
        name: 'O Globo: em andamento, 1 minuto e 5 segundos. Continuar',
      }),
    ).toBeInTheDocument()
  })

  it('na Cruzada Online, a situação do visitante vem do navegador pelo puzzle', async () => {
    updateSettings({ defaultSource: 'cruzadaonline' })
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

  it('as abas contam as concluídas do visitante a partir do navegador', async () => {
    await guestStore.save({
      puzzleId: publicItems[1]?.puzzleId ?? '',
      date: '2026-10-13',
      cells: [['A']],
      elapsedMs: 412_000,
      status: 'completed',
      savedAt: '2026-10-13T14:00:00.000Z',
      help: null,
    })
    mockApi({ 'GET /api/library': () => jsonResponse(200, { items: publicItems }) })
    renderRoutes(guestRoutes, ['/'], asGuest())
    expect(await screen.findByRole('tab', { name: 'O Globo 1 concluída' })).toBeInTheDocument()
    expect(screen.getByRole('tab', { name: 'Cruzada Online 0 concluídas' })).toBeInTheDocument()
  })

  it('com a API anterior (401 sem sessão), pede para entrar em vez de travar', async () => {
    const { calls } = mockApi({
      'GET /api/library': () => apiError(401, 'unauthenticated'),
    })
    renderRoutes(guestRoutes, ['/'], asGuest())
    expect(await screen.findByText('Entre para ver a biblioteca')).toBeInTheDocument()
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent(
      'Entre para ver a biblioteca',
    )
    // Um pedido por fonte e nenhuma nova tentativa.
    expect(calls.filter((call) => call.url === '/api/library?source=oglobo')).toHaveLength(1)
    expect(calls.filter((call) => call.key === 'GET /api/library')).toHaveLength(
      puzzleSourceIdSchema.options.length,
    )
  })
})

describe('aviso de "Ir direto ao jogo" (feature 021)', () => {
  it('mostra o motivo devolvido pelo loader, com o nome da cruzada, e fecha', async () => {
    library()
    const user = userEvent.setup()
    renderRoutes(
      [
        {
          path: '/',
          element: <LibraryPage />,
          loader: () => ({
            directPlay: { kind: 'stay', reason: 'completed', name: 'Cruzada Online' },
          }),
        },
      ],
      ['/'],
      withAccount(),
    )
    const notice = await screen.findByText('Cruzada Online: a cruzada de hoje já foi concluída.')
    expect(notice).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Fechar' }))
    expect(screen.queryByText('Cruzada Online: a cruzada de hoje já foi concluída.')).toBeNull()
  })
})
