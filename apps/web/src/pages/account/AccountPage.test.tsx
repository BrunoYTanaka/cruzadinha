import { screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { AppLayout } from '../../app/AppLayout'
import { applyOutboxEvent, readOutboxItems } from '../../features/offline'
import { queryKeys } from '../../shared/services/api/query-keys/query-keys'
import { PUZZLE_ID } from '../../test/fixtures'
import { expectNoA11yViolations } from '../../test/axe'
import { apiError, jsonResponse, mockApi, type Handler } from '../../test/http'
import { aUser, makeQueryClient, renderRoutes, resetSessionHandlers } from '../../test/render'
import { AccountPage } from './AccountPage'

const routes = [
  {
    element: <AppLayout />,
    children: [
      { path: '/', element: <p>Início</p> },
      { path: '/conta', element: <AccountPage /> },
      { path: '/login', element: <p>Tela de login</p> },
    ],
  },
]

function visit(user: typeof aUser | null, handlers: Record<string, Handler> = {}) {
  const queryClient = makeQueryClient()
  queryClient.setQueryData(queryKeys.session, user ? { user } : null)
  const api = mockApi({
    'GET /api/auth/me': () =>
      user ? jsonResponse(200, { user }) : apiError(401, 'unauthenticated'),
    ...handlers,
  })
  const view = renderRoutes(routes, ['/conta'], queryClient)
  return { ...api, ...view }
}

afterEach(() => {
  vi.restoreAllMocks()
  localStorage.clear()
  resetSessionHandlers()
})

describe('AccountPage', () => {
  it('shows a visitor only the invitation to sign in', async () => {
    visit(null)
    expect(await screen.findByRole('heading', { level: 1, name: 'Sua conta' })).toBeVisible()
    expect(screen.getByText('Entre para gerenciar sua conta.')).toBeVisible()
    expect(within(screen.getByRole('main')).getByRole('link', { name: 'Entrar' })).toBeVisible()
    expect(screen.queryByLabelText('Senha atual')).not.toBeInTheDocument()
  })

  it('says it needs a connection when offline', async () => {
    vi.spyOn(navigator, 'onLine', 'get').mockReturnValue(false)
    visit(aUser)
    expect(
      await screen.findByRole('heading', { level: 1, name: 'Esta tela precisa de conexão.' }),
    ).toBeVisible()
  })

  it('links the header e-mail to the page and passes axe', async () => {
    const { container } = visit(aUser)
    const link = await screen.findByRole('link', { name: `Sua conta (${aUser.email})` })
    expect(link).toHaveAttribute('href', '/conta')
    expect(await screen.findAllByRole('heading', { level: 2 })).toHaveLength(4)
    await expectNoA11yViolations(container)
  })

  it('changes the password and clears the fields; wrong password marks the field', async () => {
    let wrong = true
    const { calls } = visit(aUser, {
      'POST /api/auth/change-password': () =>
        wrong ? apiError(400, 'wrong-password') : jsonResponse(200, {}),
    })
    const user = userEvent.setup()
    const current = await screen.findAllByLabelText('Senha atual')
    await user.type(current[0] as HTMLElement, 'errada-errada')
    await user.type(screen.getByLabelText('Nova senha'), 'senha-nova-456')
    await user.click(screen.getByRole('button', { name: 'Trocar senha' }))
    expect(await screen.findByText('A senha atual não confere.')).toBeVisible()

    wrong = false
    await user.click(screen.getByRole('button', { name: 'Trocar senha' }))
    expect(
      await screen.findByText('Senha trocada. Os outros aparelhos saíram da conta.'),
    ).toBeVisible()
    expect(screen.getByLabelText('Nova senha')).toHaveValue('')
    expect(calls.filter((call) => call.key === 'POST /api/auth/change-password')).toHaveLength(2)
  })

  it('shows the wait for a 429 and the unavailable text for a 404', async () => {
    let status = 429
    visit(aUser, {
      'POST /api/auth/logout-others': () =>
        status === 429
          ? jsonResponse(
              429,
              { error: 'too-many-attempts', message: 'x', retryAfter: 120 },
              { 'retry-after': '120' },
            )
          : apiError(404, 'puzzle-unavailable'),
    })
    const user = userEvent.setup()
    await user.click(await screen.findByRole('button', { name: 'Sair dos outros aparelhos' }))
    expect(await screen.findByText('Muitas tentativas. Tente de novo em 2 min.')).toBeVisible()
    status = 404
    await user.click(screen.getByRole('button', { name: 'Sair dos outros aparelhos' }))
    expect(await screen.findByText('Esta ação não está disponível agora.')).toBeVisible()
  })

  it('logs out the other devices', async () => {
    visit(aUser, { 'POST /api/auth/logout-others': () => jsonResponse(200, {}) })
    await userEvent.click(await screen.findByRole('button', { name: 'Sair dos outros aparelhos' }))
    expect(await screen.findByText('Os outros aparelhos saíram da conta.')).toBeVisible()
  })

  it('refuses the current e-mail without a request and counts down after sending', async () => {
    const { calls } = visit(aUser, {
      'POST /api/auth/change-email': () => jsonResponse(202, { retryAfter: 60 }),
    })
    const user = userEvent.setup()
    await user.type(await screen.findByLabelText('Novo e-mail'), aUser.email.toUpperCase())
    const passwords = screen.getAllByLabelText('Senha atual')
    await user.type(passwords[1] as HTMLElement, 'senha-boa-123')
    await user.click(screen.getByRole('button', { name: 'Enviar link' }))
    expect(await screen.findByText('Esse já é o seu e-mail.')).toBeVisible()
    expect(calls.some((call) => call.key === 'POST /api/auth/change-email')).toBe(false)

    await user.clear(screen.getByLabelText('Novo e-mail'))
    await user.type(screen.getByLabelText('Novo e-mail'), 'Nova@Exemplo.com')
    await user.click(screen.getByRole('button', { name: 'Enviar link' }))
    expect(await screen.findByText(/Enviamos um link para nova@exemplo.com/)).toBeVisible()
    expect(screen.getByRole('button', { name: /Enviar link em/ })).toBeDisabled()
  })

  it('deletes the account: cleans this device, keeps the guest data and lands as a guest', async () => {
    applyOutboxEvent(aUser.id, PUZZLE_ID, { type: 'reset', at: '2026-10-16T12:00:00.000Z' })
    vi.spyOn(navigator, 'onLine', 'get').mockReturnValue(true)
    const { calls, queryClient } = visit(aUser, {
      'POST /api/auth/delete-account': () => jsonResponse(200, {}),
    })
    const user = userEvent.setup()
    await user.click(await screen.findByRole('button', { name: 'Excluir conta' }))
    const dialog = await screen.findByRole('dialog', { name: 'Excluir a conta?' })
    expect(within(dialog).getByText(/Não há como desfazer/)).toBeVisible()
    expect(within(dialog).getByLabelText('Senha atual')).toHaveFocus()

    await user.type(within(dialog).getByLabelText('Senha atual'), 'senha-boa-123')
    await user.click(within(dialog).getByRole('button', { name: 'Excluir para sempre' }))

    expect(await screen.findByText('Início')).toBeVisible()
    expect(screen.getByText('Sua conta foi excluída.')).toBeVisible()
    expect(queryClient.getQueryData(queryKeys.session)).toBeNull()
    expect(readOutboxItems(aUser.id, PUZZLE_ID)).toHaveLength(0)
    expect(calls.filter((call) => call.key === 'POST /api/auth/delete-account')).toHaveLength(1)
  })

  it('keeps everything when the password is wrong and Esc cancels', async () => {
    visit(aUser, { 'POST /api/auth/delete-account': () => apiError(400, 'wrong-password') })
    const user = userEvent.setup()
    await user.click(await screen.findByRole('button', { name: 'Excluir conta' }))
    const dialog = await screen.findByRole('dialog')
    await user.type(within(dialog).getByLabelText('Senha atual'), 'errada-errada')
    await user.click(within(dialog).getByRole('button', { name: 'Excluir para sempre' }))
    expect(await within(dialog).findByText('A senha atual não confere.')).toBeVisible()
    await user.keyboard('{Escape}')
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument())
    expect(screen.getByRole('heading', { level: 1, name: 'Sua conta' })).toBeVisible()
  })
})
