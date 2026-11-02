import { act, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, describe, expect, it } from 'vitest'
import { expectNoA11yViolations } from '../../test/axe'
import { DUEL_ID, finishedResult, LINK, makeDuelView, NOW } from '../../test/duel-fixtures'
import { apiError, jsonResponse, mockApi } from '../../test/http'
import { aUser, makeQueryClient, renderRoutes } from '../../test/render'
import { queryKeys } from '../../shared/services/api/query-keys/query-keys'
import { duelTokens } from '../../features/duel/services/duel-tokens'
import { DuelPage } from './DuelPage'

const routes = [
  { path: '/x1/:linkToken', element: <DuelPage /> },
  { path: '/calendario', element: <p>Calendário</p> },
]

const STATE = 'POST /api/duels/state'
const LOOKUP = 'POST /api/duels/lookup'
const START = 'POST /api/duels/start'
const DECLINE = 'POST /api/duels/decline'
const CANCEL = 'POST /api/duels/cancel'

function open(handlers: Parameters<typeof mockApi>[0], { guest = true } = {}) {
  const api = mockApi(handlers)
  const queryClient = makeQueryClient()
  queryClient.setQueryData(queryKeys.session, guest ? null : { user: aUser })
  const view = renderRoutes(routes, [`/x1/${LINK}`], queryClient)
  return { ...api, ...view }
}

const state = (duel = makeDuelView(), extra: object = {}) =>
  jsonResponse(200, { duel, serverNow: NOW, ...extra })

const preview = {
  linkToken: LINK,
  rules: {
    helpMode: 'penalty',
    helpPenaltyMs: 30_000,
    maxMs: 1_800_000,
    startDeadlineAt: '2026-10-15T15:00:00.000Z',
  },
  source: 'oglobo',
  puzzleDate: '2026-10-14',
  creatorNickname: 'Ana',
}

afterEach(() => {
  window.localStorage.clear()
  window.history.replaceState(null, '', '/')
})

describe('DuelPage: convite', () => {
  it('mostra as regras e não fecha por Esc nem por clique fora', async () => {
    const user = userEvent.setup()
    open({
      [STATE]: () => apiError(404, 'not-found'),
      [LOOKUP]: () => jsonResponse(200, preview),
    })
    const dialog = await screen.findByRole('dialog', { name: 'Ana desafiou você' })
    expect(dialog).toHaveTextContent('soma 30 s')
    expect(dialog).toHaveTextContent('30 min')
    await user.keyboard('{Escape}')
    await user.click(document.body)
    expect(screen.getByRole('dialog', { name: 'Ana desafiou você' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Começar' })).toBeVisible()
    expect(screen.getByRole('button', { name: 'Agora não' })).toBeVisible()
    expect(screen.getByRole('button', { name: 'Recusar desafio' })).toBeVisible()
  })

  it('abrir o convite só consulta: nada de começar nem recusar', async () => {
    const api = open({
      [STATE]: () => apiError(404, 'not-found'),
      [LOOKUP]: () => jsonResponse(200, preview),
    })
    await screen.findByRole('dialog')
    expect(api.calls.map((call) => call.key).sort()).toEqual([LOOKUP, STATE])
  })

  it('"Começar" envia o apelido e guarda o token do visitante', async () => {
    const user = userEvent.setup()
    const api = open({
      [STATE]: () => apiError(404, 'not-found'),
      [LOOKUP]: () => jsonResponse(200, preview),
      [START]: () =>
        jsonResponse(200, {
          participantToken: 'p'.repeat(43),
          duel: makeDuelView({
            role: 'opponent',
            status: 'running',
            myStatus: 'waiting-other',
            me: { nickname: 'Beto', startedAt: NOW },
          }),
          puzzleId: DUEL_ID,
          startedAt: NOW,
          serverNow: NOW,
        }),
    })
    await screen.findByRole('dialog')
    await user.type(screen.getByLabelText('Seu apelido'), 'Beto')
    await user.click(screen.getByRole('button', { name: 'Começar' }))
    await waitFor(() => expect(api.calls.some((call) => call.key === START)).toBe(true))
    expect(api.calls.find((call) => call.key === START)?.body).toEqual({
      linkToken: LINK,
      nickname: 'Beto',
    })
    await waitFor(async () => expect(await duelTokens.get(LINK)).toBe('p'.repeat(43)))
  })

  it('dois "Começar" ao mesmo tempo: quem perde vê que o x1 já foi aceito', async () => {
    const user = userEvent.setup()
    open({
      [STATE]: () => apiError(404, 'not-found'),
      [LOOKUP]: () => jsonResponse(200, preview),
      [START]: () => apiError(409, 'duel-taken'),
    })
    await screen.findByRole('dialog')
    await user.type(screen.getByLabelText('Seu apelido'), 'Caio')
    await user.click(screen.getByRole('button', { name: 'Começar' }))
    expect(await screen.findByRole('alert')).toHaveTextContent('já foi aceito')
  })

  it('"Recusar desafio" encerra o duelo', async () => {
    const user = userEvent.setup()
    const api = open({
      [STATE]: () => apiError(404, 'not-found'),
      [LOOKUP]: () => jsonResponse(200, preview),
      [DECLINE]: () => jsonResponse(200, { declined: true }),
    })
    await screen.findByRole('dialog')
    await user.click(screen.getByRole('button', { name: 'Recusar desafio' }))
    expect(await screen.findByRole('heading', { name: 'Desafio recusado' })).toBeVisible()
    expect(api.calls.find((call) => call.key === DECLINE)?.body).toEqual({ linkToken: LINK })
  })

  it('"Agora não" sai sem chamar nada que mude o duelo', async () => {
    const user = userEvent.setup()
    const api = open({
      [STATE]: () => apiError(404, 'not-found'),
      [LOOKUP]: () => jsonResponse(200, preview),
    })
    await screen.findByRole('dialog')
    await user.click(screen.getByRole('button', { name: 'Agora não' }))
    expect(await screen.findByText('Calendário')).toBeVisible()
    expect(api.calls.map((call) => call.key)).not.toContain(START)
    expect(api.calls.map((call) => call.key)).not.toContain(DECLINE)
  })

  it('duelo que não está aberto: mensagem única', async () => {
    open({
      [STATE]: () => apiError(404, 'not-found'),
      [LOOKUP]: () => apiError(404, 'not-found'),
    })
    expect(await screen.findByRole('heading', { name: 'Este x1 não está aberto' })).toBeVisible()
  })

  it('API anterior à feature (404 sem código): "não está disponível agora"', async () => {
    open({ [STATE]: () => jsonResponse(404, { message: 'Route POST:/api/duels/state not found' }) })
    expect(
      await screen.findByRole('heading', { name: 'O x1 não está disponível agora' }),
    ).toBeVisible()
  })
})

describe('DuelPage: participante', () => {
  it('criador com o duelo aberto vê o código, o link e as ações', async () => {
    const user = userEvent.setup()
    const { container, calls } = open({
      [STATE]: () => state(makeDuelView({ code: 'ABCD2345' })),
      [CANCEL]: () => jsonResponse(200, { duel: makeDuelView({ status: 'cancelled' }) }),
    })
    expect(await screen.findByText('ABCD2345')).toBeVisible()
    expect(screen.getByText(`${window.location.origin}/x1/${LINK}`)).toBeVisible()
    expect(screen.getByRole('button', { name: 'Começar a minha partida' })).toBeVisible()
    await expectNoA11yViolations(container)

    await user.click(screen.getByRole('button', { name: 'Cancelar x1' }))
    expect(screen.getByRole('dialog', { name: 'Cancelar este x1?' })).toHaveTextContent(
      'não pode ser desfeito',
    )
    await user.click(screen.getByRole('button', { name: 'Cancelar o x1' }))
    await waitFor(() => expect(calls.some((call) => call.key === CANCEL)).toBe(true))
  })

  it('quem terminou primeiro vê "Aguardando o oponente", sem tempo do outro', async () => {
    const { container } = open({
      [STATE]: () =>
        state(
          makeDuelView({
            status: 'running',
            myStatus: 'waiting-other',
            opponentStatus: 'playing',
            opponentNickname: 'Beto',
            me: { nickname: 'Ana', startedAt: NOW },
          }),
        ),
    })
    expect(await screen.findByRole('heading', { name: 'Aguardando o oponente' })).toBeVisible()
    expect(screen.queryByRole('table')).not.toBeInTheDocument()
    await expectNoA11yViolations(container)
  })

  it.each([
    ['won', 'Você venceu!'],
    ['lost', 'Você perdeu.'],
    ['tie', 'Empate!'],
  ] as const)('resultado %s mostra vencedor, diferença e os dois tempos', async (verdict, text) => {
    const { container } = open({
      [STATE]: () =>
        state(
          makeDuelView({
            status: 'finished',
            myStatus: 'done',
            opponentStatus: 'done',
            opponentNickname: 'Beto',
            result: finishedResult(verdict),
          }),
        ),
    })
    expect(await screen.findByRole('heading', { name: text })).toBeVisible()
    expect(screen.getByText(/Diferença de 00:12/)).toBeVisible()
    expect(screen.getByRole('table')).toHaveTextContent('05:00')
    expect(screen.getByRole('table')).toHaveTextContent('05:12')
    await expectNoA11yViolations(container)
  })

  it('duelo expirado e cancelado dizem o que aconteceu', async () => {
    open({ [STATE]: () => state(makeDuelView({ status: 'expired', myStatus: 'done' })) })
    expect(await screen.findByRole('heading', { name: /prazo deste x1 venceu/ })).toBeVisible()
  })

  it('o fragmento #p= é guardado uma vez, usado no pedido e tirado do endereço', async () => {
    window.history.replaceState(null, '', `/x1/${LINK}#p=${'q'.repeat(43)}`)
    const api = open({ [STATE]: () => state() })
    await screen.findByRole('button', { name: 'Começar a minha partida' })
    expect(api.calls.find((call) => call.key === STATE)?.body).toEqual({
      linkToken: LINK,
      participantToken: 'q'.repeat(43),
    })
    expect(window.location.hash).toBe('')
    expect(await duelTokens.get(LINK)).toBe('q'.repeat(43))
  })

  it('conta usa a sessão: nenhum token vai no pedido', async () => {
    const api = open({ [STATE]: () => state() }, { guest: false })
    await screen.findByRole('button', { name: 'Começar a minha partida' })
    expect(api.calls.find((call) => call.key === STATE)?.body).toEqual({ linkToken: LINK })
    await act(async () => {})
  })
})
