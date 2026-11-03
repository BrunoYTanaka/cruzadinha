import { screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { AppLayout } from '../../app/AppLayout'
import { queryKeys } from '../../shared/services/api/query-keys/query-keys'
import { expectNoA11yViolations } from '../../test/axe'
import { apiError, jsonResponse, mockApi } from '../../test/http'
import { aUser, makeQueryClient, renderRoutes, resetSessionHandlers } from '../../test/render'
import { AdminPage } from './AdminPage'

const routes = [
  {
    element: <AppLayout />,
    children: [{ path: '/admin', element: <AdminPage /> }],
  },
]

const sources = [
  { id: 'oglobo', visible: true, position: 0 },
  { id: 'cruzadaonline', visible: true, position: 1 },
  { id: 'cruzadasbrasil', visible: true, position: 2 },
  { id: 'clube', visible: true, position: 3 },
]

function visit(user: (typeof aUser & { isAdmin: boolean }) | null) {
  const queryClient = makeQueryClient()
  queryClient.setQueryData(queryKeys.session, user ? { user } : null)
  mockApi({
    'GET /api/auth/me': () =>
      user ? jsonResponse(200, { user }) : apiError(401, 'unauthenticated'),
    'GET /api/admin/sources': () =>
      user?.isAdmin ? jsonResponse(200, { sources }) : apiError(404, 'not-found'),
  })
  return renderRoutes(routes, ['/admin'], queryClient)
}

afterEach(() => {
  vi.restoreAllMocks()
  resetSessionHandlers()
})

describe('AdminPage', () => {
  it('shows an admin the sources editor', async () => {
    const view = visit({ ...aUser, isAdmin: true })
    expect(await screen.findByRole('heading', { level: 1, name: 'Administração' })).toBeVisible()
    expect(await screen.findByRole('checkbox', { name: /O Globo/ })).toBeVisible()
    await expectNoA11yViolations(view.container)
  })

  it.each([
    ['a guest', null],
    ['a plain account', { ...aUser, isAdmin: false }],
  ])('shows %s the same page as a missing address', async (_name, user) => {
    visit(user)
    expect(
      await screen.findByRole('heading', { level: 1, name: 'Página não encontrada' }),
    ).toBeVisible()
    expect(screen.queryByRole('link', { name: 'Administração' })).not.toBeInTheDocument()
  })

  it('says it needs a connection offline, never "not found" (an admin cannot be told apart offline)', async () => {
    vi.spyOn(navigator, 'onLine', 'get').mockReturnValue(false)
    visit({ ...aUser, isAdmin: false })
    expect(
      await screen.findByRole('heading', { name: 'Esta tela precisa de conexão.' }),
    ).toBeVisible()
    expect(screen.queryByText('Página não encontrada')).not.toBeInTheDocument()
  })
})
