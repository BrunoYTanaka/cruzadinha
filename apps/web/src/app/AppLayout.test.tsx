import { screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { applyOutboxEvent, readOutboxItems } from '../features/offline'
import { queryKeys } from '../shared/services/api/query-keys/query-keys'
import { PUZZLE_ID } from '../test/fixtures'
import { jsonResponse, mockApi } from '../test/http'
import { aUser, makeQueryClient, renderRoutes, resetSessionHandlers } from '../test/render'
import { AccountPage } from '../pages/account/AccountPage'
import { AppLayout } from './AppLayout'

const body = {
  cells: [['A', null]],
  elapsedMs: 1000,
  status: 'in_progress' as const,
  savedAt: '2026-10-16T12:00:00.000Z',
}
const OTHER = '9a8b7c6d-5e4f-4a3b-9c2d-1e0f9a8b7c6d'

function render(user: typeof aUser | null, path = '/', serverDown = false) {
  const queryClient = makeQueryClient()
  queryClient.setQueryData(queryKeys.session, user ? { user } : null)
  const api = mockApi({
    'POST /api/auth/logout': () => jsonResponse(200, {}),
    // Servidor fora: a pendência não é enviada e fica (a tela da conta precisa estar online).
    [`PUT /api/progress/${PUZZLE_ID}`]: () =>
      serverDown ? jsonResponse(500, {}) : jsonResponse(200, { progress: null }),
    [`GET /api/progress/${PUZZLE_ID}`]: () =>
      serverDown ? jsonResponse(500, {}) : jsonResponse(200, { progress: null }),
    [`POST /api/progress/${PUZZLE_ID}`]: () =>
      serverDown ? jsonResponse(500, {}) : jsonResponse(200, { progress: null }),
  })
  renderRoutes(
    [
      {
        path: '/',
        element: <AppLayout />,
        children: [
          { index: true, element: <p>Início</p> },
          // "Sair" mora em "Sua conta" (feature 062).
          { path: 'conta', element: <AccountPage /> },
        ],
      },
    ],
    [path],
    queryClient,
  )
  return api
}

afterEach(() => {
  vi.restoreAllMocks()
  localStorage.clear()
  resetSessionHandlers()
})

describe('cabeçalho da conta (feature 062)', () => {
  it('logada, mostra o círculo com as iniciais que leva a "Sua conta", sem botão Sair', async () => {
    render(aUser)
    const circle = await screen.findByRole('link', { name: /^Sua conta/ })
    expect(circle).toHaveAttribute('href', '/conta')
    expect(circle).toHaveTextContent(/^[A-Z0-9?]{1,2}$/)
    expect(screen.queryByRole('button', { name: 'Sair' })).not.toBeInTheDocument()
  })

  it('o visitante não vê o círculo e continua com "Entrar"', async () => {
    render(null)
    expect(await screen.findByRole('link', { name: 'Entrar' })).toBeInTheDocument()
    expect(screen.queryByRole('link', { name: /^Sua conta/ })).not.toBeInTheDocument()
  })

  it('o botão de menu abre Estatísticas e x1', async () => {
    render(aUser)
    await userEvent.click(await screen.findByRole('button', { name: 'Menu' }))
    expect(screen.getByRole('menuitem', { name: 'Estatísticas' })).toBeInTheDocument()
    expect(screen.getByRole('menuitem', { name: /^x1/ })).toBeInTheDocument()
  })
})

describe('AppLayout e as pendências offline (feature 041)', () => {
  it('sair sem pendência não pergunta nada', async () => {
    const { calls } = render(aUser, '/conta')
    await userEvent.click(await screen.findByRole('button', { name: 'Sair' }))
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    await waitFor(() =>
      expect(calls.some((call) => call.key === 'POST /api/auth/logout')).toBe(true),
    )
  })

  it('sair com pendência pergunta; cancelar mantém tudo, confirmar apaga e sai', async () => {
    applyOutboxEvent(aUser.id, PUZZLE_ID, { type: 'reset', at: '2026-10-16T12:00:00.000Z' })
    const { calls } = render(aUser, '/conta', true)
    const leave = await screen.findByRole('button', { name: 'Sair' })
    await userEvent.click(leave)
    const dialog = await screen.findByRole('dialog', { name: 'Sair agora?' })
    await userEvent.click(screen.getByRole('button', { name: 'Cancelar' }))
    expect(dialog).not.toBeInTheDocument()
    expect(calls.some((call) => call.key === 'POST /api/auth/logout')).toBe(false)

    await userEvent.click(screen.getByRole('button', { name: 'Sair' }))
    await userEvent.click(await screen.findByRole('button', { name: 'Sair mesmo assim' }))
    await waitFor(() =>
      expect(calls.some((call) => call.key === 'POST /api/auth/logout')).toBe(true),
    )
    expect(readOutboxItems(aUser.id, PUZZLE_ID)).toEqual([])
  })

  it('outra conta entrando descarta as pendências da anterior e avisa', async () => {
    applyOutboxEvent(OTHER, PUZZLE_ID, { type: 'save', body })
    render(aUser)
    expect(
      await screen.findByText('O progresso não enviado da conta anterior foi descartado.'),
    ).toBeInTheDocument()
    expect(readOutboxItems(OTHER, PUZZLE_ID)).toEqual([])
  })

  it('o visitante não vê aviso de progresso esperando uma conta e nada é enviado', async () => {
    applyOutboxEvent(OTHER, PUZZLE_ID, { type: 'save', body })
    const { calls } = render(null)
    await screen.findByRole('link', { name: 'Cruzadinha' })
    expect(screen.queryByText('Há progresso esperando você entrar.')).not.toBeInTheDocument()
    expect(calls.some((call) => call.key.startsWith('PUT'))).toBe(false)
    expect(readOutboxItems(OTHER, PUZZLE_ID)).toHaveLength(1)
  })
})

describe('AppLayout e o cabeçalho (feature 048)', () => {
  it('liga a marca à landing e oferece o link do calendário', async () => {
    render(null)
    expect(await screen.findByRole('link', { name: 'Cruzadinha' })).toHaveAttribute('href', '/')
    expect(screen.getByRole('link', { name: 'Calendário' })).toHaveAttribute('href', '/calendario')
  })
})
