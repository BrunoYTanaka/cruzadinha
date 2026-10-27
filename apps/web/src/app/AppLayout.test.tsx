import { screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { applyOutboxEvent, readOutboxItems } from '../features/offline'
import { queryKeys } from '../shared/services/api/query-keys/query-keys'
import { PUZZLE_ID } from '../test/fixtures'
import { jsonResponse, mockApi } from '../test/http'
import { aUser, makeQueryClient, renderRoutes, resetSessionHandlers } from '../test/render'
import { AppLayout } from './AppLayout'

const body = {
  cells: [['A', null]],
  elapsedMs: 1000,
  status: 'in_progress' as const,
  savedAt: '2026-10-16T12:00:00.000Z',
}
const OTHER = '9a8b7c6d-5e4f-4a3b-9c2d-1e0f9a8b7c6d'

function render(user: typeof aUser | null) {
  const queryClient = makeQueryClient()
  queryClient.setQueryData(queryKeys.session, user ? { user } : null)
  const api = mockApi({
    'POST /api/auth/logout': () => jsonResponse(200, {}),
    [`PUT /api/progress/${PUZZLE_ID}`]: () => jsonResponse(200, { progress: null }),
    [`GET /api/progress/${PUZZLE_ID}`]: () => jsonResponse(200, { progress: null }),
  })
  renderRoutes(
    [{ path: '/', element: <AppLayout />, children: [{ index: true, element: <p>Início</p> }] }],
    ['/'],
    queryClient,
  )
  return api
}

afterEach(() => {
  vi.restoreAllMocks()
  localStorage.clear()
  resetSessionHandlers()
})

describe('AppLayout e as pendências offline (feature 041)', () => {
  it('sair sem pendência não pergunta nada', async () => {
    const { calls } = render(aUser)
    await userEvent.click(await screen.findByRole('button', { name: 'Sair' }))
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    await waitFor(() =>
      expect(calls.some((call) => call.key === 'POST /api/auth/logout')).toBe(true),
    )
  })

  it('sair com pendência pergunta; cancelar mantém tudo, confirmar apaga e sai', async () => {
    // Sem rede a pendência fica: o envio automático só roda com rede.
    vi.spyOn(navigator, 'onLine', 'get').mockReturnValue(false)
    applyOutboxEvent(aUser.id, PUZZLE_ID, { type: 'reset', at: '2026-10-16T12:00:00.000Z' })
    const { calls } = render(aUser)
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

  it('o visitante vê que há progresso esperando uma conta, sem enviar nada', async () => {
    applyOutboxEvent(OTHER, PUZZLE_ID, { type: 'save', body })
    const { calls } = render(null)
    expect(await screen.findByText('Há progresso esperando você entrar.')).toBeInTheDocument()
    expect(calls.some((call) => call.key.startsWith('PUT'))).toBe(false)
    expect(readOutboxItems(OTHER, PUZZLE_ID)).toHaveLength(1)
  })
})
