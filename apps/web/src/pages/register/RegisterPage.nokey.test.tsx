import { screen } from '@testing-library/react'
import { afterEach, describe, expect, it } from 'vitest'
import { apiError, jsonResponse, mockApi } from '../../test/http'
import { renderRoutes, resetSessionHandlers } from '../../test/render'
import { RegisterPage } from './RegisterPage'

afterEach(() => resetSessionHandlers())

// Sem VITE_TURNSTILE_SITE_KEY no build (configuração errada): o desafio não existe e "Tentar de
// novo" não resolveria, então só o aviso aparece e o envio segue bloqueado (feature 049).
describe('cadastro com captcha exigido e sem chave pública no site', () => {
  it('mostra o aviso sem o botão de nova tentativa e bloqueia o envio', async () => {
    mockApi({
      'GET /api/auth/me': () => apiError(401, 'unauthenticated'),
      'GET /api/auth/registration': () => jsonResponse(200, { open: true, captchaRequired: true }),
    })
    renderRoutes([{ path: '/cadastro', element: <RegisterPage /> }], ['/cadastro'])
    expect(await screen.findByRole('alert')).toHaveTextContent(
      'Não foi possível carregar a verificação de segurança.',
    )
    expect(screen.queryByRole('button', { name: 'Tentar de novo' })).not.toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Criar conta' })).toBeDisabled()
  })
})
