import { act, cleanup, fireEvent, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { queryKeys } from '../../shared/services/api/query-keys'
import { clearExpired } from '../session/session-expired'
import { cellsFrom, makeProgress, makePuzzleResponse, PUZZLE_ID, TINY } from '../../test/fixtures'
import { expectNoA11yViolations } from '../../test/axe'
import { apiError, jsonResponse, mockApi } from '../../test/http'
import { desktop, mockMatchMedia, phone } from '../../test/media'
import { aUser, makeQueryClient, renderRoutes, resetSessionHandlers } from '../../test/render'
import { setSettingsOpen } from '../settings/services/settings-open'
import { updateSettings } from '../../shared/services/settings-store'
import { loadBoardSize } from './board-size'
import { GamePage } from './GamePage'
import { useMeasuredSpace } from './useMeasuredSpace'

// Sem layout no jsdom: os testes de tamanho simulam só a medida do espaço e usam o `useBoardSize`
// real. Por padrão não há medida, como no jsdom.
vi.mock('./useMeasuredSpace', () => ({ useMeasuredSpace: vi.fn(() => null) }))

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

  it('mostra o nome da fonte junto da data no topo e no título da aba (feature 015)', async () => {
    openGame({
      [PUZZLE]: () => jsonResponse(200, makePuzzleResponse(TINY, { source: 'cruzadaonline' })),
    })
    const title = await screen.findByRole('heading', { level: 1 })
    expect(title).toHaveTextContent(/^Cruzada Online\s*Cruzada de 14 de outubro$/)
    await waitFor(() => expect(document.title).toMatch(/Cruzada de 14 de outubro · Cruzada Online/))
  })

  it('mostra "Cruzadas Brasil" no topo e no título da aba (feature 029)', async () => {
    openGame({
      [PUZZLE]: () => jsonResponse(200, makePuzzleResponse(TINY, { source: 'cruzadasbrasil' })),
    })
    const title = await screen.findByRole('heading', { level: 1 })
    expect(title).toHaveTextContent(/^Cruzadas Brasil\s*Cruzada de 14 de outubro$/)
    await waitFor(() =>
      expect(document.title).toMatch(/Cruzada de 14 de outubro · Cruzadas Brasil/),
    )
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
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('Cruzada não encontrada.')
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
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('Sem conexão')
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
    // Feature 017: o salvamento não aparece na tela, nem antes nem depois do envio.
    expect(screen.queryByText('Salvando…')).toBeNull()
    expect(screen.queryByText('Salvo')).toBeNull()
    await act(() => vi.advanceTimersByTimeAsync(1600))
    const saves = calls.filter((call) => call.key === SAVE)
    expect(saves).toHaveLength(1)
    expect(saves[0]?.body).toMatchObject({
      status: 'in_progress',
      cells: cellsFrom(['C..', '.#.', '...']),
    })
    await act(() => vi.advanceTimersByTimeAsync(0))
    expect(screen.queryByText('Salvando…')).toBeNull()
    expect(screen.queryByText('Salvo')).toBeNull()
  })

  it('um salvamento lento não cobre o tabuleiro com a espera do servidor (FR-011)', async () => {
    const user = setup()
    openGame({ [SAVE]: () => new Promise<Response>(() => {}) })
    await screen.findByRole('grid')
    await user.keyboard('C')
    await act(() => vi.advanceTimersByTimeAsync(1600 + 5000))
    expect(grid()).toBeInTheDocument()
    expect(screen.queryByText(/Acordando o servidor/)).not.toBeInTheDocument()
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

  describe('layout de computador (feature 011)', () => {
    afterEach(() => {
      vi.unstubAllGlobals()
    })

    const board = () => screen.getByRole('region', { name: 'Tabuleiro' })
    const clues = () => screen.getByRole('complementary', { name: 'Dicas' })

    it('põe a barra da dica ativa acima do tabuleiro e deixa só as listas ao lado', async () => {
      mockMatchMedia(desktop)
      openGame()
      await screen.findByRole('grid')
      const bar = within(board()).getByText('Dica 1 horizontal')
      expect(bar.compareDocumentPosition(grid()) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy()
      expect(within(clues()).queryByRole('button', { name: 'Próxima dica' })).toBeNull()
      expect(within(clues()).getByRole('region', { name: 'Horizontais' })).toBeInTheDocument()
      expect(within(clues()).getByRole('region', { name: 'Verticais' })).toBeInTheDocument()
      expect(within(clues()).getByText(/Fonte: O Globo/)).toBeInTheDocument()
      expect(board().parentElement?.className).toMatch(/desktop/)
    })

    it('"Próxima dica" e "Dica anterior" trocam a palavra e devolvem o foco ao tabuleiro', async () => {
      const user = setup()
      mockMatchMedia(desktop)
      openGame()
      await screen.findByRole('grid')
      const live = () => within(board()).getByText(/^Dica \d+ (horizontal|vertical)$/).textContent
      const before = live()
      await user.click(screen.getByRole('button', { name: 'Próxima dica' }))
      expect(live()).not.toBe(before)
      expect(grid()).toHaveFocus()
      await user.click(screen.getByRole('button', { name: 'Dica anterior' }))
      expect(live()).toBe(before)
      expect(grid()).toHaveFocus()
    })

    it('no celular a tela fica como na feature 010', async () => {
      mockMatchMedia(phone)
      openGame()
      await screen.findByRole('grid')
      expect(screen.queryByRole('button', { name: 'Próxima dica' })).toBeNull()
      expect(screen.queryByRole('complementary', { name: 'Dicas' })).toBeNull()
      expect(board().parentElement?.className).not.toMatch(/desktop/)
    })
  })

  describe('tamanho do tabuleiro (feature 011)', () => {
    // Grade 3 × 3: 3·c + 6 ≤ espaço. Altura 228 → padrão 74; largura 340 → máximo 110.
    const SPACE = { width: 340, height: 228 }
    const KEY = 'cruzadinha:board-size'
    const handle = () => screen.getByRole('slider', { name: 'Tamanho do tabuleiro' })
    const reset = () => screen.getByRole('button', { name: 'Tamanho padrão' })
    const cellSize = () => grid().style.getPropertyValue('--cell-size')

    beforeEach(() => {
      vi.mocked(useMeasuredSpace).mockImplementation((_ref, enabled) => (enabled ? SPACE : null))
    })

    afterEach(() => {
      vi.mocked(useMeasuredSpace).mockImplementation(() => null)
      vi.unstubAllGlobals()
    })

    it('mostra a alça no padrão e "Tamanho padrão" indisponível', async () => {
      mockMatchMedia(desktop)
      openGame()
      await screen.findByRole('grid')
      expect(handle()).toHaveAttribute('aria-valuetext', 'Tamanho do tabuleiro 74 de 110, padrão')
      expect(cellSize()).toBe('74px')
      expect(reset()).toBeDisabled()
    })

    it('as setas mudam e guardam o tamanho; "Tamanho padrão" apaga', async () => {
      const user = setup()
      mockMatchMedia(desktop)
      openGame()
      await screen.findByRole('grid')
      handle().focus()
      await user.keyboard('{ArrowRight}')
      expect(loadBoardSize()).toBe(84)
      expect(cellSize()).toBe('84px')
      expect(handle()).toHaveAttribute('aria-valuetext', 'Tamanho do tabuleiro 84 de 110')
      await user.click(reset())
      expect(loadBoardSize()).toBeNull()
      expect(cellSize()).toBe('74px')
      expect(reset()).toBeDisabled()
    })

    it('clique duplo na alça volta ao padrão', async () => {
      window.localStorage.setItem(KEY, '{"cellSize":100}')
      mockMatchMedia(desktop)
      openGame()
      await screen.findByRole('grid')
      expect(cellSize()).toBe('100px')
      fireEvent.doubleClick(handle())
      expect(loadBoardSize()).toBeNull()
      expect(cellSize()).toBe('74px')
    })

    it('mudar o tamanho 10 vezes não mexe no jogo nem no salvamento', async () => {
      const user = setup()
      mockMatchMedia(desktop)
      const { calls } = openGame()
      await screen.findByRole('grid')
      await user.click(screen.getByRole('button', { name: /Revelar letra/ }))
      await user.keyboard('x')
      await vi.advanceTimersByTimeAsync(2000)
      const cellsBefore = screen
        .getAllByRole('gridcell')
        .map((cell) => cell.getAttribute('aria-label'))
      const selected = grid().getAttribute('aria-activedescendant')
      const clue = within(screen.getByRole('region', { name: 'Tabuleiro' })).getByText(
        /^Dica /,
      ).textContent
      const saves = calls.filter((call) => call.key === SAVE).length
      handle().focus()
      for (let index = 0; index < 10; index += 1) {
        await user.keyboard(index % 2 === 0 ? '{ArrowRight}' : '{ArrowLeft}')
      }
      await vi.advanceTimersByTimeAsync(2000)
      expect(
        screen.getAllByRole('gridcell').map((cell) => cell.getAttribute('aria-label')),
      ).toEqual(cellsBefore)
      expect(grid().getAttribute('aria-activedescendant')).toBe(selected)
      expect(
        within(screen.getByRole('region', { name: 'Tabuleiro' })).getByText(/^Dica /).textContent,
      ).toBe(clue)
      expect(screen.getByText('1/4 Letra')).toBeInTheDocument()
      expect(calls.filter((call) => call.key === SAVE).length).toBe(saves)
    })

    it('uma escolha guardada vale ao abrir; na pausa a alça some', async () => {
      const user = setup()
      window.localStorage.setItem(KEY, '{"cellSize":90}')
      mockMatchMedia(desktop)
      openGame()
      await screen.findByRole('grid')
      expect(cellSize()).toBe('90px')
      await user.click(screen.getByRole('button', { name: 'Pausar' }))
      expect(screen.queryByRole('slider')).toBeNull()
    })

    it('no celular não há alça nem "Tamanho padrão", e a escolha é ignorada', async () => {
      window.localStorage.setItem(KEY, '{"cellSize":90}')
      mockMatchMedia(phone)
      openGame()
      await screen.findByRole('grid')
      expect(screen.queryByRole('slider')).toBeNull()
      expect(screen.queryByRole('button', { name: 'Tamanho padrão' })).toBeNull()
      expect(cellSize()).toBe('')
      expect(loadBoardSize()).toBe(90)
    })

    it('ao passar do celular para o computador, a escolha guardada volta a valer', async () => {
      window.localStorage.setItem(KEY, '{"cellSize":90}')
      const media = mockMatchMedia(phone)
      openGame()
      await screen.findByRole('grid')
      expect(cellSize()).toBe('')
      act(() => media.change(desktop))
      expect(cellSize()).toBe('90px')
      act(() => media.change(phone))
      expect(cellSize()).toBe('')
      expect(loadBoardSize()).toBe(90)
    })
  })

  // Feature 016: a dica só fica riscada quando a palavra está certa. CAL / A#O / SOL: 1 horizontal
  // CAL, 3 horizontal SOL, 1 vertical CAS, 2 vertical LOL.
  describe('configurações ao vivo (feature 021)', () => {
    afterEach(() => {
      vi.unstubAllGlobals()
    })

    it('mudar o limite de letras com a partida aberta muda as ajudas na hora', async () => {
      const user = setup()
      openGame()
      await screen.findByRole('grid')
      act(() => updateSettings({ helpLetters: 1 }))
      expect(screen.getByRole('button', { name: /Revelar letra/ })).toHaveAccessibleName(
        'Revelar letra: 0 de 1 usadas',
      )
      await user.click(screen.getByRole('gridcell', { name: /^Linha 1, coluna 1,/ }))
      await user.click(screen.getByRole('button', { name: /Revelar letra/ }))
      expect(screen.getByRole('button', { name: /Revelar letra/ })).toHaveAccessibleName(
        'Revelar letra: limite de 1 atingido',
      )
      act(() => updateSettings({ helpLetters: null }))
      expect(screen.getByRole('button', { name: /Revelar letra/ })).toHaveAccessibleName(
        'Revelar letra: sem limite, 1 usadas',
      )
    })

    it('reduzir o limite abaixo do usado mantém as letras reveladas (FR-009)', async () => {
      const user = setup()
      openGame()
      await screen.findByRole('grid')
      act(() => updateSettings({ helpLetters: 3 }))
      for (const col of [1, 2]) {
        await user.click(
          screen.getByRole('gridcell', { name: new RegExp(`^Linha 1, coluna ${col},`) }),
        )
        await user.click(screen.getByRole('button', { name: /Revelar letra/ }))
      }
      act(() => updateSettings({ helpLetters: 1 }))
      expect(
        screen.getByRole('gridcell', { name: /^Linha 1, coluna 1, letra C/ }),
      ).toBeInTheDocument()
      expect(
        screen.getByRole('gridcell', { name: /^Linha 1, coluna 2, letra A/ }),
      ).toBeInTheDocument()
      expect(screen.getByRole('button', { name: /Revelar letra/ })).toHaveAccessibleName(
        'Revelar letra: limite de 1 atingido',
      )
    })

    it('trocar o modo de riscar muda a lista na hora, sem mudar a altura reservada', async () => {
      const user = setup()
      mockMatchMedia(desktop)
      openGame()
      await screen.findByRole('grid')
      await user.click(grid())
      await user.keyboard('CXL')
      const clues = screen.getByRole('complementary', { name: 'Dicas' })
      const first = () => within(clues).getByRole('button', { name: /^1 ?Dica 1 horizontal/ })
      expect(first()).toHaveAccessibleName(/^1 ?Dica 1 horizontal$/)
      act(() => updateSettings({ strikeMode: 'filled' }))
      expect(first()).toHaveAccessibleName(/^1 ?Dica 1 horizontal, preenchida$/)
      expect(first().className).toMatch(/struck/)
      expect(first().querySelector('svg')).toBeNull()
      act(() => updateSettings({ strikeMode: 'solved' }))
      expect(first()).toHaveAccessibleName(/^1 ?Dica 1 horizontal$/)
    })

    it('a modal aberta suspende o relógio sem a capa de pausa e fechar retoma', async () => {
      openGame()
      await screen.findByRole('grid')
      await act(() => vi.advanceTimersByTimeAsync(3000))
      act(() => setSettingsOpen(true))
      const frozen = screen.getByRole('timer').textContent
      await act(() => vi.advanceTimersByTimeAsync(5000))
      expect(screen.getByRole('timer')).toHaveTextContent(frozen ?? '')
      expect(screen.queryByText('Jogo pausado')).not.toBeInTheDocument()
      act(() => setSettingsOpen(false))
      await act(() => vi.advanceTimersByTimeAsync(3000))
      expect(screen.getByRole('timer').textContent).not.toBe(frozen)
    })

    it('se o jogador pausou antes, fechar a modal mantém a pausa e a capa', async () => {
      const user = setup()
      openGame()
      await screen.findByRole('grid')
      await user.click(screen.getByRole('button', { name: 'Pausar' }))
      act(() => setSettingsOpen(true))
      act(() => setSettingsOpen(false))
      const frozen = screen.getByRole('timer').textContent
      await act(() => vi.advanceTimersByTimeAsync(5000))
      expect(screen.getByRole('timer')).toHaveTextContent(frozen ?? '')
      expect(screen.getByText('Jogo pausado')).toBeInTheDocument()
    })
  })

  describe('dica riscada só ao acertar (feature 016)', () => {
    afterEach(() => {
      vi.unstubAllGlobals()
    })

    const board = () => screen.getByRole('region', { name: 'Tabuleiro' })
    const clues = () => screen.getByRole('complementary', { name: 'Dicas' })
    const clue = (number: number, direction: 'horizontal' | 'vertical') =>
      within(clues()).getByRole('button', {
        name: new RegExp(`^${number} ?Dica ${number} ${direction}(, resolvida)?$`),
      })

    async function typeAt(
      user: ReturnType<typeof setup>,
      row: number,
      col: number,
      letter: string,
    ) {
      await user.click(
        screen.getByRole('gridcell', { name: new RegExp(`^Linha ${row}, coluna ${col},`) }),
      )
      await user.keyboard(letter)
    }

    it('risca ao digitar a última letra certa e tira ao trocar uma letra; a barra ativa não risca', async () => {
      const user = setup()
      mockMatchMedia(desktop)
      const { container } = openGame()
      await screen.findByRole('grid')
      await user.click(grid())
      await user.keyboard('CA')
      expect(clue(1, 'horizontal')).toHaveAccessibleName(/^1 ?Dica 1 horizontal$/)
      await user.keyboard('L')
      expect(clue(1, 'horizontal')).toHaveAccessibleName(/^1 ?Dica 1 horizontal, resolvida$/)
      expect(clue(1, 'horizontal').className).toMatch(/done/)

      await user.click(clue(1, 'horizontal'))
      const bar = within(board()).getByText('Dica 1 horizontal')
      expect(bar.closest('[class*="done"]')).toBeNull()
      expect(within(board()).queryByText(/resolvida/)).toBeNull()
      await expectNoA11yViolations(container)

      await typeAt(user, 1, 2, 'X')
      expect(clue(1, 'horizontal')).toHaveAccessibleName(/^1 ?Dica 1 horizontal$/)
      expect(clue(1, 'horizontal').className).not.toMatch(/done/)
    })

    it('palavra completa e errada fica sem risco; corrigir pelo cruzamento risca', async () => {
      const user = setup()
      mockMatchMedia(desktop)
      openGame()
      await screen.findByRole('grid')
      await typeAt(user, 1, 1, 'C')
      await typeAt(user, 2, 1, 'A')
      await typeAt(user, 3, 1, 'X')
      expect(clue(1, 'vertical')).toHaveAccessibleName(/^1 ?Dica 1 vertical$/)
      expect(clue(1, 'vertical').className).not.toMatch(/done/)

      await typeAt(user, 3, 1, 'S')
      await typeAt(user, 3, 2, 'O')
      await typeAt(user, 3, 3, 'L')
      expect(clue(1, 'vertical')).toHaveAccessibleName(/^1 ?Dica 1 vertical, resolvida$/)
      expect(clue(3, 'horizontal')).toHaveAccessibleName(/^3 ?Dica 3 horizontal, resolvida$/)
    })

    it('"revelar palavra" risca a dica sem gastar outra ajuda; "verificar" não muda os riscos', async () => {
      const user = setup()
      mockMatchMedia(desktop)
      openGame()
      await screen.findByRole('grid')
      await user.click(grid())
      await user.click(screen.getByRole('button', { name: /Revelar palavra/ }))
      expect(clue(1, 'horizontal')).toHaveAccessibleName(/^1 ?Dica 1 horizontal, resolvida$/)
      expect(screen.getByRole('button', { name: /Revelar palavra/ })).toHaveAccessibleName(
        /Revelar palavra: 1 de/,
      )
      expect(screen.getByRole('button', { name: /Revelar letra/ })).toHaveAccessibleName(
        /Revelar letra: 0 de/,
      )

      await typeAt(user, 3, 1, 'S')
      await typeAt(user, 3, 2, 'O')
      await typeAt(user, 3, 3, 'X')
      await user.click(screen.getByRole('button', { name: 'Verificar' }))
      expect(clue(1, 'horizontal')).toHaveAccessibleName(/^1 ?Dica 1 horizontal, resolvida$/)
      expect(clue(3, 'horizontal')).toHaveAccessibleName(/^3 ?Dica 3 horizontal$/)
    })

    it('ao abrir com progresso salvo, os riscos já saem das letras guardadas', async () => {
      mockMatchMedia(desktop)
      openGame({
        [PROGRESS]: () =>
          jsonResponse(200, {
            progress: makeProgress({ cells: cellsFrom(['CAL', 'A#.', 'X..']) }),
          }),
      })
      await screen.findByRole('grid')
      expect(clue(1, 'horizontal')).toHaveAccessibleName(/^1 ?Dica 1 horizontal, resolvida$/)
      expect(clue(1, 'vertical')).toHaveAccessibleName(/^1 ?Dica 1 vertical$/)
    })

    it('no celular, a lista "Dicas" mostra a dica resolvida', async () => {
      const user = setup()
      mockMatchMedia(phone)
      openGame()
      await screen.findByRole('grid')
      for (const letter of 'CAL') await user.click(screen.getByRole('button', { name: letter }))
      await user.click(screen.getByRole('button', { name: 'Dicas' }))
      const dialog = screen.getByRole('dialog', { name: 'Dicas' })
      expect(
        within(dialog).getByRole('button', { name: /^1 ?Dica 1 horizontal, resolvida$/ }),
      ).toBeInTheDocument()
      expect(
        within(dialog).getByRole('button', { name: /^1 ?Dica 1 vertical$/ }),
      ).toBeInTheDocument()
    })
  })
})
