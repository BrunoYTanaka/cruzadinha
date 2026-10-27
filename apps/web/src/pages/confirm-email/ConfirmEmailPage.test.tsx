import { screen } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { forgetFragmentTokens } from '../../features/account'
import { expectNoA11yViolations } from '../../test/axe'
import { apiError, jsonResponse, mockApi } from '../../test/http'
import { aUser, renderRoutes, resetSessionHandlers } from '../../test/render'
import { ConfirmEmailPage } from './ConfirmEmailPage'

const TOKEN = 'c'.repeat(43)
const routes = [
  { path: '/confirmar-email', element: <ConfirmEmailPage /> },
  { path: '/conta', element: <p>Conta</p> },
  { path: '/login', element: <p>Login</p> },
]

beforeEach(() => forgetFragmentTokens())
afterEach(() => {
  resetSessionHandlers()
  window.history.replaceState(null, '', '/')
})

function visit(hash: string, signedIn: boolean, confirm = () => jsonResponse(200, {})) {
  window.history.replaceState(null, '', `/confirmar-email${hash}`)
  const api = mockApi({
    'GET /api/auth/me': () =>
      signedIn ? jsonResponse(200, { user: aUser }) : apiError(401, 'unauthenticated'),
    'POST /api/auth/confirm-email-change': confirm,
  })
  return { ...api, ...renderRoutes(routes, ['/confirmar-email']) }
}

describe('ConfirmEmailPage', () => {
  it('sends the token from the fragment once, without a click, and clears the address', async () => {
    const { calls, container } = visit(`#token=${TOKEN}`, true)
    expect(await screen.findByRole('heading', { level: 1, name: 'E-mail trocado' })).toBeVisible()
    expect(calls.filter((call) => call.key === 'POST /api/auth/confirm-email-change')).toHaveLength(
      1,
    )
    expect(calls.find((call) => call.key.includes('confirm'))?.body).toEqual({ token: TOKEN })
    expect(window.location.hash).toBe('')
    expect(await screen.findByRole('link', { name: 'Ir para sua conta' })).toHaveAttribute(
      'href',
      '/conta',
    )
    await expectNoA11yViolations(container)
  })

  it('offers sign in when there is no session in this browser', async () => {
    visit(`#token=${TOKEN}`, false)
    expect(await screen.findByRole('link', { name: 'Entrar' })).toHaveAttribute('href', '/login')
  })

  it.each([
    ['without a token', '', true],
    ['with a rejected token', `#token=${TOKEN}`, false],
  ])('says the link is no longer valid %s', async (_name, hash, signedIn) => {
    visit(hash, signedIn, () => apiError(400, 'invalid-token'))
    expect(
      await screen.findByRole('heading', { level: 1, name: 'Este link não vale mais' }),
    ).toBeVisible()
    expect(
      await screen.findByRole('link', { name: signedIn ? 'Pedir outro' : 'Entrar' }),
    ).toBeVisible()
  })
})
