import { screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { mockApi } from '../test/http'
import { renderRoutes } from '../test/render'
import { AccountPage } from './account/AccountPage'
import { ConfirmEmailPage } from './confirm-email/ConfirmEmailPage'
import { ForgotPasswordPage } from './forgot-password/ForgotPasswordPage'
import { LoginPage } from './login/LoginPage'
import { RegisterPage } from './register/RegisterPage'
import { ResetPasswordPage } from './reset-password/ResetPasswordPage'
import { StatusPage } from './status/StatusPage'
import { VerifyEmailPage } from './verify-email/VerifyEmailPage'

afterEach(() => vi.restoreAllMocks())

// Sem rede, as telas que dependem da API dizem isso em vez de mostrar o formulário (feature 041).
describe('telas que precisam de conexão', () => {
  it.each([
    ['/login', <LoginPage />],
    ['/cadastro', <RegisterPage />],
    ['/verificar-email', <VerifyEmailPage />],
    ['/esqueci-a-senha', <ForgotPasswordPage />],
    ['/redefinir-senha', <ResetPasswordPage />],
    ['/confirmar-email', <ConfirmEmailPage />],
    ['/conta', <AccountPage />],
    ['/status', <StatusPage />],
  ])('%s avisa e não mostra o formulário', async (path, element) => {
    vi.spyOn(navigator, 'onLine', 'get').mockReturnValue(false)
    mockApi({})
    renderRoutes([{ path, element }], [path])
    expect(
      await screen.findByRole('heading', { level: 1, name: 'Esta tela precisa de conexão.' }),
    ).toBeInTheDocument()
    expect(screen.queryByRole('textbox')).not.toBeInTheDocument()
  })
})
