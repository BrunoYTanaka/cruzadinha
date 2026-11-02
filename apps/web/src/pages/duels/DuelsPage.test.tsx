import { screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it } from 'vitest'
import { expectNoA11yViolations } from '../../test/axe'
import { LINK } from '../../test/duel-fixtures'
import { apiError, jsonResponse, mockApi } from '../../test/http'
import { aUser, makeQueryClient, renderRoutes } from '../../test/render'
import { queryKeys } from '../../shared/services/api/query-keys/query-keys'
import { duelTokens } from '../../features/duel/services/duel-tokens'
import { DuelsPage } from './DuelsPage'

const routes = [
  { path: '/x1', element: <DuelsPage /> },
  { path: '/x1/novo', element: <p>Novo</p> },
  { path: '/x1/:linkToken', element: <p>Duelo aberto</p> },
]

const MINE = 'POST /api/duels/mine'
const LOOKUP = 'POST /api/duels/lookup'

const preview = {
  linkToken: LINK,
  rules: {
    helpMode: 'free',
    helpPenaltyMs: null,
    maxMs: null,
    startDeadlineAt: '2026-10-15T15:00:00.000Z',
  },
  source: 'oglobo',
  puzzleDate: '2026-10-14',
  creatorNickname: 'Ana',
}

const summary = (overrides: object = {}) => ({
  duelId: '3b9d6bcd-bbfd-4b2d-9b5d-ab8dfbbd4bed',
  linkToken: LINK,
  role: 'creator',
  status: 'running',
  myStatus: 'playing',
  source: 'oglobo',
  puzzleDate: '2026-10-14',
  opponentNickname: 'Beto',
  attention: true,
  ...overrides,
})

function open(handlers: Parameters<typeof mockApi>[0], session: 'guest' | 'user' = 'user') {
  const api = mockApi(handlers)
  const queryClient = makeQueryClient()
  queryClient.setQueryData(queryKeys.session, session === 'guest' ? null : { user: aUser })
  return { ...api, ...renderRoutes(routes, ['/x1'], queryClient) }
}

describe('Meus x1', () => {
  it('conta: lista os duelos ativos vindos do servidor, sem mandar tokens', async () => {
    const { container, calls } = open({
      [MINE]: () => jsonResponse(200, { duels: [summary()] }),
    })
    expect(await screen.findByRole('link', { name: /O Globo, 14\/10\/2026/ })).toHaveAttribute(
      'href',
      `/x1/${LINK}`,
    )
    expect(screen.getByText(/contra Beto/)).toBeVisible()
    expect(screen.queryByText(/só para este aparelho/)).not.toBeInTheDocument()
    expect(calls.find((call) => call.key === MINE)?.body).toEqual({ participantTokens: [] })
    await expectNoA11yViolations(container)
  })

  it('visitante: manda os tokens do aparelho no corpo e avisa que a lista vale só aqui', async () => {
    await duelTokens.save(LINK, 't'.repeat(43))
    const { calls } = open(
      { [MINE]: () => jsonResponse(200, { duels: [summary({ attention: false })] }) },
      'guest',
    )
    expect(await screen.findByText(/só para este aparelho/)).toBeVisible()
    await waitFor(() => expect(calls.some((call) => call.key === MINE)).toBe(true))
    expect(calls.find((call) => call.key === MINE)?.body).toEqual({
      participantTokens: ['t'.repeat(43)],
    })
    expect(calls.find((call) => call.key === MINE)?.url).not.toContain('t'.repeat(10))
  })

  it('visitante sem duelos nem pergunta ao servidor', async () => {
    const { calls } = open({}, 'guest')
    expect(await screen.findByText('Nenhum x1 ativo.')).toBeVisible()
    expect(calls.some((call) => call.key === MINE)).toBe(false)
  })

  it('API anterior: avisa que o x1 não está disponível', async () => {
    open({ [MINE]: () => jsonResponse(404, { message: 'Route not found' }) })
    expect(await screen.findByText('O x1 não está disponível agora')).toBeVisible()
  })

  it('entrar por código leva ao duelo', async () => {
    const user = userEvent.setup()
    const { calls } = open({
      [MINE]: () => jsonResponse(200, { duels: [] }),
      [LOOKUP]: () => jsonResponse(200, preview),
    })
    await user.type(await screen.findByLabelText('Código ou link do x1'), 'abcd-2345')
    await user.click(screen.getByRole('button', { name: 'Entrar' }))
    expect(await screen.findByText('Duelo aberto')).toBeVisible()
    expect(calls.find((call) => call.key === LOOKUP)?.body).toEqual({ code: 'ABCD2345' })
  })

  it('aceita o link colado', async () => {
    const user = userEvent.setup()
    const { calls } = open({
      [MINE]: () => jsonResponse(200, { duels: [] }),
      [LOOKUP]: () => jsonResponse(200, preview),
    })
    await user.click(await screen.findByLabelText('Código ou link do x1'))
    await user.paste(`https://cruzadinha.example/x1/${LINK}`)
    await user.click(screen.getByRole('button', { name: 'Entrar' }))
    await screen.findByText('Duelo aberto')
    expect(calls.find((call) => call.key === LOOKUP)?.body).toEqual({ linkToken: LINK })
  })

  it('código inexistente e duelo não aberto dão a mesma mensagem', async () => {
    const user = userEvent.setup()
    open({
      [MINE]: () => jsonResponse(200, { duels: [] }),
      [LOOKUP]: () => apiError(404, 'not-found'),
    })
    const field = await screen.findByLabelText('Código ou link do x1')
    await user.type(field, 'ABCD2345')
    await user.click(screen.getByRole('button', { name: 'Entrar' }))
    const first = (await screen.findByRole('alert')).textContent
    await user.clear(field)
    await user.type(field, 'zzzz')
    await user.click(screen.getByRole('button', { name: 'Entrar' }))
    await waitFor(() => expect(screen.getByRole('alert').textContent).toBe(first))
    expect(first).toContain('Não encontramos um x1 aberto com esse código.')
  })
})
