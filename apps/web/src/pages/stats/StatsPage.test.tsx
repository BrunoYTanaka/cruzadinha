import { screen } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { guestStore } from '../../features/guest/services/guest-store'
import { queryKeys } from '../../shared/services/api/query-keys/query-keys'
import { makeLibraryItem } from '../../test/fixtures'
import { apiError, jsonResponse, mockApi } from '../../test/http'
import { aUser, makeQueryClient, renderRoutes } from '../../test/render'
import { StatsPage } from './StatsPage'

const routes = [{ path: '/', element: <StatsPage /> }]

function withAccount() {
  const queryClient = makeQueryClient()
  queryClient.setQueryData(queryKeys.session, { user: aUser })
  return queryClient
}

function asGuest() {
  const queryClient = makeQueryClient()
  queryClient.setQueryData(queryKeys.session, null)
  return queryClient
}

const stats = {
  streak: { current: 2, longest: 4 },
  total: 7,
  averageMs: 125_000,
  bySource: [{ source: 'oglobo', total: 7, averageMs: 125_000, bestMs: 61_000 }],
}

beforeEach(() => {
  vi.useFakeTimers({ toFake: ['Date'] })
  vi.setSystemTime(new Date('2026-10-14T15:00:00Z'))
})

describe('StatsPage', () => {
  it('mostra as estatísticas da conta vindas do servidor', async () => {
    mockApi({ 'GET /api/stats': () => jsonResponse(200, stats) })
    renderRoutes(routes, ['/'], withAccount())
    expect(await screen.findByRole('heading', { level: 1, name: 'Estatísticas' })).toBeVisible()
    expect(await screen.findByText('2 dias')).toBeInTheDocument()
    expect(screen.getByText('4 dias')).toBeInTheDocument()
    expect(screen.queryByText(/só para este aparelho/)).not.toBeInTheDocument()
  })

  it('avisa e deixa tentar de novo quando a API não responde (ou é antiga)', async () => {
    mockApi({ 'GET /api/stats': () => apiError(404, 'not-found') })
    renderRoutes(routes, ['/'], withAccount())
    expect(await screen.findByText(/Não foi possível carregar as estatísticas/)).toBeVisible()
    expect(screen.getByRole('button', { name: 'Tentar de novo' })).toBeVisible()
  })

  it('visitante vê só o que está no aparelho, com o aviso', async () => {
    const done = makeLibraryItem('2026-10-13')
    await guestStore.save({
      puzzleId: done.puzzleId,
      date: done.date,
      cells: [['A']],
      elapsedMs: 70_000,
      status: 'completed',
      savedAt: '2026-10-13T12:00:00.000Z',
      help: null,
    })
    mockApi({
      'GET /api/library': () => jsonResponse(200, { items: [done] }),
    })
    renderRoutes(routes, ['/'], asGuest())
    expect(await screen.findByText(/só para este aparelho/)).toBeVisible()
    expect(screen.getByText('Concluídas', { selector: 'dt' }).nextElementSibling).toHaveTextContent(
      '1',
    )
  })
})
