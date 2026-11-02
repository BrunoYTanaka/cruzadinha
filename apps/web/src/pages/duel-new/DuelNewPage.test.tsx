import { screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { expectNoA11yViolations } from '../../test/axe'
import { LINK, makeDuelView } from '../../test/duel-fixtures'
import { makeLibraryItem } from '../../test/fixtures'
import { apiError, jsonResponse, mockApi } from '../../test/http'
import { aUser, makeQueryClient, renderRoutes } from '../../test/render'
import { queryKeys } from '../../shared/services/api/query-keys/query-keys'
import { duelTokens } from '../../features/duel/services/duel-tokens'
import { DuelNewPage } from './DuelNewPage'

const routes = [{ path: '/x1/novo', element: <DuelNewPage /> }]
const CREATE = 'POST /api/duels'
const LIBRARY = 'GET /api/library'

const saved = makeLibraryItem('2026-10-13', { status: 'completed', finishedMs: 312_000 })
const fresh = makeLibraryItem('2026-10-12')

beforeEach(() => {
  vi.useFakeTimers({ toFake: ['Date'] })
  vi.setSystemTime(new Date('2026-10-14T15:00:00Z'))
})
afterEach(() => {
  vi.useRealTimers()
  window.localStorage.clear()
})

function open(handlers: Parameters<typeof mockApi>[0], guest = true) {
  const api = mockApi({
    [LIBRARY]: () => jsonResponse(200, { items: [saved, fresh] }),
    ...handlers,
  })
  const queryClient = makeQueryClient()
  queryClient.setQueryData(queryKeys.session, guest ? null : { user: aUser })
  return { ...api, ...renderRoutes(routes, ['/x1/novo'], queryClient) }
}

const created = (participantToken?: string) =>
  jsonResponse(200, {
    linkToken: LINK,
    code: 'ABCD2345',
    ...(participantToken ? { participantToken } : {}),
    duel: makeDuelView({ code: 'ABCD2345' }),
  })

describe('Novo x1', () => {
  it('escolhe o dia no calendário, cria e mostra o link, o código e o link de retorno', async () => {
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime })
    const { calls, container } = open({ [CREATE]: () => created('r'.repeat(43)) })
    await user.click(await screen.findByRole('button', { name: /13 de outubro.*você já fez esta/ }))
    await user.clear(screen.getByLabelText('5. Seu apelido'))
    await user.type(screen.getByLabelText('5. Seu apelido'), 'Ana')
    await user.click(screen.getByRole('radio', { name: 'Com penalidade' }))
    await user.click(screen.getByRole('radio', { name: '+60 s por ajuda' }))
    await user.click(screen.getByRole('radio', { name: '15 min' }))
    await user.click(screen.getByRole('button', { name: 'Criar x1' }))

    expect(await screen.findByRole('heading', { name: 'x1 criado' })).toBeVisible()
    expect(calls.find((call) => call.key === CREATE)?.body).toEqual({
      puzzleId: saved.puzzleId,
      nickname: 'Ana',
      rules: {
        helpMode: 'penalty',
        helpPenaltyMs: 60_000,
        maxMs: 900_000,
        startDeadlineHours: 24,
      },
    })
    expect(screen.getByText('ABCD2345')).toBeVisible()
    expect(screen.getByText(`${window.location.origin}/x1/${LINK}`)).toBeVisible()
    expect(
      screen.getByText(`${window.location.origin}/x1/${LINK}#p=${'r'.repeat(43)}`),
    ).toBeVisible()
    // O visitante guarda o token neste aparelho.
    await waitFor(async () => expect(await duelTokens.get(LINK)).toBe('r'.repeat(43)))
    await expectNoA11yViolations(container)
  })

  it('só dias guardados são botões; dia não guardado não pode ser escolhido', async () => {
    open({})
    await screen.findByRole('button', { name: /13 de outubro/ })
    expect(screen.getByRole('img', { name: /11 de outubro.*não pode ser escolhido/ })).toBeVisible()
    expect(screen.queryByRole('link', { name: /de outubro/ })).not.toBeInTheDocument()
  })

  it('conta recebe link e código sem token de visitante', async () => {
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime })
    open({ [CREATE]: () => created() }, false)
    await user.click(await screen.findByRole('button', { name: /12 de outubro/ }))
    await user.type(screen.getByLabelText('5. Seu apelido'), 'Ana')
    await user.click(screen.getByRole('button', { name: 'Criar x1' }))
    await screen.findByRole('heading', { name: 'x1 criado' })
    expect(screen.queryByText(/Link para voltar a este x1/)).not.toBeInTheDocument()
  })

  it('pede a cruzada e o apelido antes de enviar', async () => {
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime })
    const { calls } = open({})
    await screen.findByRole('button', { name: /13 de outubro/ })
    await user.click(screen.getByRole('button', { name: 'Criar x1' }))
    expect(await screen.findByText(/Escolha no calendário uma cruzada/)).toBeVisible()
    await user.click(screen.getByRole('button', { name: /13 de outubro/ }))
    await user.click(screen.getByRole('button', { name: 'Criar x1' }))
    expect(screen.getByText('Informe o seu apelido.')).toBeVisible()
    expect(calls.some((call) => call.key === CREATE)).toBe(false)
  })

  it.each([
    ['open-limit', 409, /x1 abertos demais/],
    ['too-many-attempts', 429, /Muitos x1 criados/],
  ] as const)('mensagem clara para %s', async (code, status, text) => {
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime })
    open({ [CREATE]: () => apiError(status, code) })
    await user.click(await screen.findByRole('button', { name: /12 de outubro/ }))
    await user.type(screen.getByLabelText('5. Seu apelido'), 'Ana')
    await user.click(screen.getByRole('button', { name: 'Criar x1' }))
    expect(await screen.findByText(text)).toBeVisible()
    expect(within(document.body).queryByRole('heading', { name: 'x1 criado' })).toBeNull()
  })
})
