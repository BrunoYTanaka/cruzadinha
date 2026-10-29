import { screen, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { resetServerWake } from '../shared/services/api/server-wake/server-wake'
import { jsonResponse, mockApi } from '../test/http'
import { aUser, makeQueryClient, renderRoutes, resetSessionHandlers } from '../test/render'
import { makePuzzleResponse, TINY, PUZZLE_ID } from '../test/fixtures'
import { savePuzzle } from '../features/offline'
import { writeLastUser } from '../features/session/services/last-user/last-user'
import { updateSettings } from '../shared/services/settings-store/settings-store'
import { todayInBrasilia } from '../shared/helpers/dates/dates'
import { markSourceDown } from '../features/library/helpers/source-down'
import { makeLibraryItem } from '../test/fixtures'
import { createAppRoutes } from './router'

const healthUp = () => jsonResponse(200, { status: 'ok', database: 'up' })
const htmlDown = () =>
  new Response('<html>acordando</html>', { status: 503, headers: { 'content-type': 'text/html' } })
const withSession = () => jsonResponse(200, { user: aUser })

const rendered: Array<{ dispose: () => void }> = []

function renderApp(path: string) {
  const queryClient = makeQueryClient()
  const result = renderRoutes(createAppRoutes(queryClient), [path], queryClient)
  rendered.push(result.router)
  return result
}

beforeEach(() => {
  resetServerWake()
})

afterEach(() => {
  // Um loader ainda em andamento (como o do jogo) não pode pedir à API do teste seguinte.
  for (const router of rendered.splice(0)) router.dispose()
  vi.restoreAllMocks()
  resetSessionHandlers()
  resetServerWake()
  vi.unstubAllGlobals()
})

describe('entrada do site com a espera do servidor', () => {
  it('mostra o layout com a espera no lugar do conteúdo enquanto o servidor não responde', async () => {
    mockApi({ 'GET /api/health': () => new Promise<Response>(() => {}) })
    renderApp('/login')
    expect(await screen.findByRole('link', { name: 'Cruzadinha' })).toBeInTheDocument()
    expect(screen.getByRole('status')).toHaveTextContent('Carregando…')
    expect(screen.queryByRole('heading', { name: 'Entrar' })).not.toBeInTheDocument()
  })

  it('consulta o health antes da sessão', async () => {
    const { calls } = mockApi({
      'GET /api/health': healthUp,
      'GET /api/auth/me': withSession,
      'GET /api/library': () => jsonResponse(200, { items: [] }),
    })
    renderApp('/calendario')
    await waitFor(() => expect(calls.some((call) => call.key === 'GET /api/auth/me')).toBe(true))
    const keys = calls.map((call) => call.key)
    expect(keys[0]).toBe('GET /api/health')
    expect(keys.indexOf('GET /api/health')).toBeLessThan(keys.indexOf('GET /api/auth/me'))
  })

  it('sem sessão abre a biblioteca, e não o login (feature 013)', async () => {
    mockApi({
      'GET /api/health': healthUp,
      'GET /api/auth/me': () => jsonResponse(401, { error: 'unauthenticated', message: 'x' }),
      'GET /api/library': () => jsonResponse(200, { items: [] }),
    })
    const { router } = renderApp('/calendario')
    await waitFor(() => expect(router.state.navigation.state).toBe('idle'))
    expect(router.state.location.pathname).toBe('/calendario')
    await waitFor(() =>
      expect(screen.queryByText('Carregando a biblioteca…')).not.toBeInTheDocument(),
    )
    expect(screen.queryByRole('heading', { name: 'Entrar' })).not.toBeInTheDocument()
  })

  it('não espera o health na página de status', async () => {
    mockApi({ 'GET /api/health': () => new Promise<Response>(() => {}) })
    renderApp('/status')
    expect(await screen.findByRole('heading', { name: 'Cruzadinha' })).toBeInTheDocument()
  })

  it('preserva o endereço pedido depois da espera', async () => {
    mockApi({ 'GET /api/health': healthUp, 'GET /api/auth/me': withSession })
    const { router } = renderApp('/dia/2026-10-01?x=1')
    await waitFor(() => expect(router.state.navigation.state).toBe('idle'))
    await waitFor(() => expect(router.state.location.pathname).toBe('/dia/2026-10-01'))
    expect(router.state.location.search).toBe('?x=1')
  })

  it('não consulta o health de novo ao navegar depois de pronto', async () => {
    const { calls } = mockApi({
      'GET /api/health': healthUp,
      'GET /api/auth/me': withSession,
      'GET /api/library': () => jsonResponse(200, { items: [] }),
    })
    const { router } = renderApp('/calendario')
    await waitFor(() => expect(calls.some((call) => call.key === 'GET /api/auth/me')).toBe(true))
    await router.navigate('/dia/2026-10-01?outro=1')
    await waitFor(() => expect(router.state.location.search).toBe('?outro=1'))
    expect(calls.filter((call) => call.key === 'GET /api/health')).toHaveLength(1)
  })

  it.each(['/calendario', '/dia/2026-10-01', '/jogo/abc', '/login', '/cadastro'])(
    'com a API dormindo, %s só pede algo além da saúde depois de ela responder 200 e não mostra erro',
    async (path) => {
      let healthCalls = 0
      const awake = () => healthCalls > 1
      const { calls } = mockApi({
        'GET /api/health': () => {
          healthCalls += 1
          return awake() ? healthUp() : jsonResponse(503, { error: 'service-unavailable' })
        },
        'GET /api/auth/me': () =>
          awake() ? jsonResponse(401, { error: 'unauthenticated', message: 'x' }) : htmlDown(),
        'GET /api/library': () => jsonResponse(200, { items: [] }),
      })
      const { router } = renderApp(path)
      await waitFor(() => expect(awake()).toBe(true), { timeout: 5000 })
      await waitFor(() => expect(calls.some((call) => call.key === 'GET /api/auth/me')).toBe(true))
      // Cada tela faz um pedido seu logo depois da sessão (a do jogo, só quando o código carrega).
      // Esperar por ele evita que o pedido caia no mock do teste seguinte.
      await waitFor(() => expect(calls.length).toBeGreaterThan(3))
      await waitFor(() => expect(router.state.navigation.state).toBe('idle'))
      expect(screen.queryByText('Algo deu errado')).not.toBeInTheDocument()
      const firstOther = calls.findIndex((call) => call.key !== 'GET /api/health')
      const lastHealth = calls.map((call) => call.key).lastIndexOf('GET /api/health')
      expect(firstOther).toBeGreaterThan(lastHealth)
    },
    10000,
  )

  it('sair da tela durante a espera não deixa pedido de sessão pendente', async () => {
    let awake = false
    const { calls } = mockApi({
      'GET /api/health': () =>
        awake ? healthUp() : jsonResponse(503, { error: 'service-unavailable' }),
      'GET /api/auth/me': () => jsonResponse(401, { error: 'unauthenticated', message: 'x' }),
    })
    const { router } = renderApp('/calendario')
    await router.navigate('/status')
    awake = true
    await new Promise((resolve) => setTimeout(resolve, 2_500))
    expect(calls.some((call) => call.key === 'GET /api/auth/me')).toBe(false)
  }, 8000)

  it('uma cruzada guardada abre sem rede e sem esperar o servidor nem a sessão (feature 041, FR-019)', async () => {
    await savePuzzle(makePuzzleResponse(TINY))
    writeLastUser(aUser)
    vi.spyOn(navigator, 'onLine', 'get').mockReturnValue(false)
    const { calls } = mockApi({ 'GET /api/health': () => new Promise<Response>(() => {}) })
    const { router } = renderApp(`/jogo/${PUZZLE_ID}`)
    await waitFor(() => expect(router.state.navigation.state).toBe('idle'))
    expect(await screen.findByRole('grid')).toBeInTheDocument()
    expect(calls.some((call) => call.key === 'GET /api/auth/me')).toBe(false)
  })

  it('sem cópia guardada, /jogo espera o servidor como as outras telas', async () => {
    mockApi({ 'GET /api/health': () => new Promise<Response>(() => {}) })
    renderApp(`/jogo/${PUZZLE_ID}`)
    expect(await screen.findByRole('status')).toHaveTextContent('Carregando…')
    expect(screen.queryByRole('grid')).not.toBeInTheDocument()
  })
})

describe('landing em / e "Ir direto ao jogo" (feature 048)', () => {
  afterEach(() => window.localStorage.clear())

  it('abre a landing sem esperar o servidor nem pedir nada à API', async () => {
    const { calls } = mockApi({ 'GET /api/health': () => new Promise<Response>(() => {}) })
    renderApp('/')
    // A rota substitui o fallback logo depois do primeiro desenho.
    await waitFor(() =>
      expect(
        screen.getByRole('heading', { level: 1, name: /Palavras cruzadas todo dia/ }),
      ).toBeInTheDocument(),
    )
    expect(screen.getByRole('link', { name: 'Calendário' })).toHaveAttribute('href', '/calendario')
    expect(calls.some((call) => call.key === 'GET /api/auth/me')).toBe(false)
  })

  it('com o ajuste ligado mostra a tela de espera, nunca a landing, enquanto o servidor acorda', async () => {
    updateSettings({ directToGame: true })
    mockApi({ 'GET /api/health': () => new Promise<Response>(() => {}) })
    renderApp('/')
    expect(await screen.findByRole('status')).toHaveTextContent('Carregando…')
    expect(
      screen.queryByRole('heading', { level: 1, name: /Palavras cruzadas todo dia/ }),
    ).not.toBeInTheDocument()
  })

  it('com o ajuste ligado leva ao jogo, também ao voltar a / pelo logo', async () => {
    updateSettings({ directToGame: true, defaultSource: 'cruzadaonline' })
    const item = makeLibraryItem(todayInBrasilia(), { source: 'cruzadaonline' })
    mockApi({
      'GET /api/health': healthUp,
      'GET /api/auth/me': () => jsonResponse(401, { error: 'unauthenticated', message: 'x' }),
      'GET /api/library': () => jsonResponse(200, { items: [item] }),
    })
    const { router } = renderApp('/')
    await waitFor(() => expect(router.state.location.pathname).toBe(`/jogo/${item.puzzleId}`))
    await router.navigate('/calendario')
    await router.navigate('/')
    await waitFor(() => expect(router.state.location.pathname).toBe(`/jogo/${item.puzzleId}`))
  })

  it('com o ajuste ligado e sem destino vai ao calendário com o motivo', async () => {
    markSourceDown('cruzadaonline')
    updateSettings({ directToGame: true, defaultSource: 'cruzadaonline' })
    mockApi({
      'GET /api/health': healthUp,
      'GET /api/auth/me': () => jsonResponse(401, { error: 'unauthenticated', message: 'x' }),
      'GET /api/library': () => jsonResponse(200, { items: [] }),
    })
    const { router } = renderApp('/')
    await waitFor(() => expect(router.state.location.pathname).toBe('/calendario'))
    expect(await screen.findByText('Cruzada Online está fora do ar agora.')).toBeInTheDocument()
  })

  it('/jogar leva ao dia de hoje da cruzada padrão', async () => {
    updateSettings({ defaultSource: 'cruzadaonline' })
    mockApi({
      'GET /api/health': healthUp,
      'GET /api/auth/me': () => jsonResponse(401, { error: 'unauthenticated', message: 'x' }),
    })
    const { router } = renderApp('/jogar')
    await waitFor(() => expect(router.state.location.pathname).toBe(`/dia/${todayInBrasilia()}`))
    expect(router.state.location.search).toBe('?fonte=cruzadaonline')
  })
})
